'use strict';

const assert = require('assert');
const minimatch = require('minimatch');
const debug = require('debug')('baiji:adapters:socketio');
const SocketIOContext = require('../contexts/socketio');
const Adapter = require('../Adapter');

module.exports = class SocketIOAdapter extends Adapter {
  constructor(app, options) {
    super(app, options);

    this.Context = SocketIOContext;

    // Init methodsTree for later search usage
    this.methodsTree = Object.create(null);
  }

  createHandler() {
    let options = Object.assign(this.options);
    let io = require('socket.io')(options);

    let adapter = this;

    // Method wrapper
    let wrapper = (method) => {
      let fn = method.stack;
      let verb = method.http.verb;
      let skipHooks = method.skipHooks;
      let isMiddleware = verb === 'use';

      if (isMiddleware) {
        // Handler for middleware function
        return (socket, next) => {
          let ctx = adapter.createContext(socket, {}, method, adapter.options);
          return fn(ctx, function (ctx) {
            if (ctx.error) return next(ctx.error);
            // Allow socketio middleware go next by checking verb and skipHooks both meeting condition
            if (skipHooks && typeof next === 'function') next();
          });
        };
      } else {
        // handler for normal function
        return (socket, methodName, args) => {
          let ctx = adapter.createContext(socket, args, method, adapter.options);
          ctx.clientMethodName = methodName;
          return fn(ctx);
        };
      }
    };

    // Generate all methods
    adapter.methods = adapter.createMethodsBy(wrapper);

    // Sorted methods: simply copy of methods
    adapter.sortedMethods = adapter.methods.slice();

    // build methodsTree and use socketio middlewares
    adapter.sortedMethods.forEach((method) => {
      assert(!adapter.methodsTree[method.name], `Duplicate method '${method.name}' found!`);
      adapter.methodsTree[method.name] = method;

      // use middleware
      if (method.verb === 'use') {
        debug('Using middleware %s', method.name);
        io.use(method.handler);
      }
    });

    // Main invocation functionality
    // Expose `invoke` and `result` event to client
    io.on('connection', function(socket) {
      socket.on('invoke', function(methodName, args) {
        let method = adapter.searchMethod(methodName);
        if (method) {
          method.handler(socket, methodName, args);
        } else {
          // Default handler for unknown method
          socket.emit('result', {
            id: socket.id,
            error: 'method does not exist',
            methodName: methodName
          });
        }
      });
    });

    // allow adapter reference from handler
    io.baijiAdapter = this;

    return io;
  }

  searchMethod(name) {
    name = name || '';
    // Use methodsTree to search method
    let method = this.methodsTree[name];
    // middleware can't be invoked
    if (method && method.verb !== 'use') return method;

    // If non exists, use wildcard to search method
    for (let methodName in this.methodsTree) {
      if (minimatch(name, methodName)) {
        return this.methodsTree[methodName];
      }
    }
  }
};
