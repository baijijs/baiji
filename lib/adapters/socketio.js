'use strict';

const assert = require('assert');
const mm = require('micromatch');
const _ = require('lodash');
const debug = require('debug')('baiji:adapters:socketio');
const SocketIOContext = require('../contexts/socketio');
const Adapter = require('../Adapter');

module.exports = class SocketIOAdapter extends Adapter {
  constructor(app, options) {
    super(app, options);

    this.Context = SocketIOContext;

    // Init actionsTree for later search usage
    this.actionsTree = Object.create(null);
    this.actionNames = [];
  }

  createHandler() {
    let options = _.assign(this.options);
    let io = require('socket.io')(options);

    let adapter = this;

    // Action wrapper
    let wrapper = function(action) {
      let verb = action.route.verb;
      let skipHooks = action.skipHooks;
      let isMiddleware = verb === 'use';

      if (isMiddleware) {
        // Handler for middleware function
        return function(socket, next) {
          let ctx = adapter.createContext(socket, {}, action, adapter.options);
          return action.invoke(ctx, function (ctx) {
            if (ctx.error) return next(ctx.error);
            // Allow socketio middleware go next by checking verb and skipHooks both meeting condition
            if (skipHooks && typeof next === 'function') next();
          });
        };
      } else {
        // handler for normal function
        return function(socket, actionName, args) {
          let ctx = adapter.createContext(socket, args, action, adapter.options);
          ctx.clientActionName = actionName;
          return action.invoke(ctx);
        };
      }
    };

    // Generate all actions
    adapter.actions = adapter.createActionsBy(wrapper);

    // Sorted actions: simply copy of actions
    adapter.sortedActions = adapter.actions.slice();

    // build actionsTree and use socketio middlewares
    _.each(adapter.sortedActions, function(action) {
      assert(!adapter.actionsTree[action.name], `Duplicate action '${action.name}' found!`);
      adapter.actionsTree[action.name] = action;
      adapter.actionNames.push(action.name);

      // use middleware
      if (action.verb === 'use') {
        debug('Using middleware %s', action.name);
        io.use(action.handler);
      }
    });

    // Main invocation functionality
    // Expose `invoke` and `result` event to client
    io.on('connection', function(socket) {
      socket.on('invoke', function(actionName, args) {
        let action = adapter.searchAction(actionName);
        if (action) {
          action.handler(socket, actionName, args);
        } else {
          // Default handler for unknown action
          socket.emit('result', {
            id: socket.id,
            error: 'action does not exist',
            actionName: actionName
          });
        }
      });
    });

    // allow adapter reference from handler
    io.baijiAdapter = this;

    return io;
  }

  searchAction(name) {
    name = name || '';
    // Use actionsTree to search action
    let action = this.actionsTree[name];
    // middleware can't be invoked
    if (action && action.verb !== 'use') return action;

    let actionNames = this.actionNames || [];
    // If non exists, use wildcard to search action
    for (let i = 0; i < actionNames.length; i++) {
      let actionName = actionNames[i];
      if (mm.isMatch(name, actionName)) return this.actionsTree[actionName];
    }
  }
};
