'use strict';

const assert = require('assert');
const _ = require('lodash');
const debug = require('debug')('baiji:Adapter');
const sortRoute = require('./utils/sortRoute');
const Application = require('./Application');

// Basic Adapter apis that all child adapters should implement
module.exports = class Adapter {
  constructor(app, options) {
    assert(app instanceof Application, 'app must be an instance of \'Application\'');

    this.app = app;

    // Merge options
    this.options = _.assign({}, app.get('adapterOptions'), options);

    // Routes
    this.routes = [];

    // Routes sorted by verb
    this.sortedRoutes = [];
  }

  // Generate Actions by wrapper
  createRoutesBy(wrapper) {
    assert(typeof wrapper === 'function', `${wrapper} is not a valid wrapper function`);

    // Generate actions with composed invoking stack
    let adapterName = this.app.get('adapter');

    let routes = [];
    this.app.composedActions(function(action) {
      // Filter specific action object that all Adapter can use
      if (action.isSupport(adapterName)) {
        const path = action.fullPath;
        const name = action.fullName;
        const { description, notes, upload } = action;

        // Support multiple verbs
        _.each(action.route.verb, function(verb) {
          let route = {
            name,
            verb,
            path,
            description,
            notes,
            upload
          };

          route.handler = wrapper(action, route);

          routes.push(route);
        });
      }
    });

    this.routes = routes;

    return routes;
  }

  sortRoutes(routes) {
    // Sort routes, keep the middleware action in front of all other routes
    let middlewares = [];
    let _routes = [];

    _.each(routes, function(route) {
      if (route.verb === 'use') {
        middlewares.push(route);
      } else {
        _routes.push(route);
      }
    });

    // Save sorted routes
    _routes = _routes.sort(sortRoute);
    this.sortedRoutes = middlewares.concat(_routes);

    return this.sortedRoutes;
  }

  /**
   * Return a handler, notably means express or socketio instance
   *
   * @return {Function}
   * @public
   */
  createHandler() {
    throw new Error('Not Implement');
  }

  /**
   * Initialize a new context.
   *
   * @api private
   */
  createContext() {
    let Context = this.Context;
    assert(
      typeof Context === 'function',
      `${Context} is not a valid Context`
    );

    // create Context
    let ctx = Context.create.apply(null, arguments);

    // Adapter reference
    ctx.adapter = this;

    // App reference
    ctx.app = this.app;

    // Inject global context properties into context
    return ctx.injectProps(this.app.context);
  }

  /**
   * Return a request handler callback
   * for node's native http server.
   *
   * @return {Function}
   * @public
   */
  callback() {
    let handler = this.createHandler();
    this.debugAllActions();
    return (req, res, next) => handler(req, res, next);
  }

  /**
   * Return a http server by listen on specific port
   * for node's native http server.
   *
   * @return {Function}
   * @public
   */
  listen() {
    let handler = this.createHandler();
    this.debugAllActions();
    handler.listen.apply(handler, arguments);
  }

  debugAllActions(isDebug) {
    let props = ['name', 'verb', 'path', 'description'];
    let infos = {};
    isDebug = isDebug !== false;

    // Find longest description of `props` for better displaying
    function setMaxLength(prop) {
      let lengthName = `${prop}Length`;
      infos[lengthName] = 0;
      return function(str) {
        let length = (str || '').length;
        if (length > infos[lengthName]) infos[lengthName] = length;
      };
    }

    // Loop all routes' route info
    _.each(this.routes, function(route) {
      _.each(props, function(prop) {
        if (!infos[prop]) infos[prop] = [];
        let val = route[prop] || '';
        if (prop === 'verb') val = val.toUpperCase();
        infos[prop].push(val);
      });
    });

    // Find longtest description of each `prop`
    _.each(props, function(prop) {
      _.each(infos[prop], setMaxLength(prop));
    });

    // Print debug info of routes one by one
    let count = this.routes.length;
    let messages = [`All Routes: (${count})`];
    let i = 0;

    while(i < count) {
      let sentence = _.map(props, function(prop) {
        return _.padEnd(infos[prop][i], infos[`${prop}Length`]);
      });
      sentence.unshift('=>');
      messages.push(sentence.join(' '));
      i++;
    }

    if (isDebug) debug(messages.join('\n'));

    return messages;
  }
};
