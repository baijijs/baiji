'use strict';

const assert = require('assert');
const magico = require('magico');
const debug = require('debug')('baiji:Adapter');
const utils = require('./utils');

// Basic Adapter apis that all child adapters should implement
module.exports = class Adapter {
  constructor(app, options) {
    assert(app, `${app} can not be empty`);

    this.app = app;

    // Merge options
    this.options = Object.assign({}, magico.get(app.settings, 'adapterOptions') || {});
    this.options = Object.assign(this.options, options || {});

    // Methods
    this.methods = [];

    // Methods sorted by route
    this.sortedMethods = [];
  }

  createMethodsBy(wrapper) {
    assert(typeof wrapper === 'function', `${wrapper} is not a valid function`);

    // Generate methods with composed invoking stack
    let methods = this.app.composedMethods();
    let adapterName = this.app.get('adapter');

    // Generate and filter all methods
    return methods.filter((method) => {
      return method.isSupport(adapterName);
    }).map((method) => {
      let path = method.fullPath();
      let name = method.fullName();
      let verb = method.http.verb;

      // Return specific method object that all Adapter can use
      return {
        verb: verb,
        path: path,
        name: name,
        description: method.description,
        notes: method.notes,
        handler: wrapper(method)
      };
    });
  }

  /**
   * Return a handler, notably means express or socketio instance
   *
   * @return {Function}
   * @api public
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
    assert(typeof Context === 'function', `${Context} is not a valid Context function`);
    let args = Array.from(arguments);
    // Set `null` as Context apply context,
    // equal to `Context.bind(null, arg1, arg2, ...)`
    args.unshift(null);
    let ctx = new (Function.prototype.bind.apply(Context, args));
    ctx.adapter = this;
    return ctx;
  }

  /**
   * Return a request handler callback
   * for node's native http server.
   *
   * @return {Function}
   * @api public
   */
  callback() {
    let handler = this.createHandler();
    this.debugAllMethods();
    return (req, res, next) => {
      handler(req, res, next);
    };
  }

  /**
   * Return a http server by listen on specific port
   * for node's native http server.
   *
   * @return {Function}
   * @api public
   */
  listen() {
    let handler = this.createHandler();
    this.debugAllMethods();
    handler.listen.apply(handler, arguments);
  }

  debugAllMethods() {
    let types = ['name', 'verb', 'path', 'description'];
    let infos = {};

    // Find longest description of `types` for better displaying
    function setMaxLength(type) {
      let lengthName = `${type}Length`;
      infos[lengthName] = 0;
      return function(str) {
        let length = (str || '').length;
        if (length > infos[lengthName]) infos[lengthName] = length;
      };
    }

    // Loop all methods' route info
    this.methods.forEach((route) => {
      types.forEach((type) => {
        if (!infos[type]) infos[type] = [];
        infos[type].push(route[type] || '');
      });
    });

    // Find longtest description of each `type`
    types.forEach((type) => infos[type].forEach(setMaxLength(type)));

    // Print debug info of methods one by one
    let count = this.methods.length;
    debug(`All Methods: (${count})`);
    let i = 0;
    while(i < count) {
      let sentence = types.map((type) => utils.padRight(infos[type][i], infos[`${type}Length`]));
      sentence.unshift('=>');
      debug(sentence.join(' '));
      i++;
    }
  }
};
