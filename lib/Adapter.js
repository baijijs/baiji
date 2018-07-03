'use strict';

const assert = require('assert');
const _ = require('lodash');
const debug = require('debug')('baiji:Adapter');
const utils = require('./utils');
const Application = require('./Application');

// Basic Adapter apis that all child adapters should implement
module.exports = class Adapter {
  constructor(app, options) {
    assert(app instanceof Application, 'app must be an instance of \'Application\'');

    this.app = app;

    // Merge options
    this.options = _.assign({}, app.get('adapterOptions'), options);

    // Actions
    this.actions = [];

    // Actions sorted by route
    this.sortedActions = [];
  }

  // Generate Actions by wrapper
  createActionsBy(wrapper) {
    assert(typeof wrapper === 'function', `${wrapper} is not a valid wrapper function`);

    // Generate actions with composed invoking stack
    let actions = this.app.composedActions();
    let adapterName = this.app.get('adapter');

    // Generate and filter all actions
    return _(actions).filter(function(action) {
      return action.isSupport(adapterName);
    }).map(function(action) {
      let path = action.fullPath();
      let name = action.fullName();
      let verb = action.route.verb;

      // Return specific action object that all Adapter can use
      return {
        verb: verb,
        path: path,
        name: name,
        description: action.description,
        notes: action.notes,
        upload: action.upload,
        handler: wrapper(action)
      };
    }).value();
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

    //

    return ctx;
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

    // Loop all actions' route info
    _.each(this.actions, function(route) {
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

    // Print debug info of actions one by one
    let count = this.actions.length;
    let messages = [`All Actions: (${count})`];
    let i = 0;

    while(i < count) {
      let sentence = _.map(props, function(prop) {
        return utils.padRight(infos[prop][i], infos[`${prop}Length`]);
      });
      sentence.unshift('=>');
      messages.push(sentence.join(' '));
      i++;
    }

    if (isDebug) debug(messages.join('\n'));

    return messages;
  }
};
