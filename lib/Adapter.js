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

  // Generate Methods by wrapper
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
      let verb = method.route.verb;

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
    assert(typeof Context === 'function', `${Context} is not a valid Context function`);

    // create Context
    let ctx = Context.create.apply(null, arguments);

    ctx.adapter = this;

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
   * @public
   */
  listen() {
    let handler = this.createHandler();
    this.debugAllMethods();
    handler.listen.apply(handler, arguments);
  }

  debugAllMethods() {
    let props = ['name', 'verb', 'path', 'description'];
    let infos = {};

    // Find longest description of `props` for better displaying
    function setMaxLength(prop) {
      let lengthName = `${prop}Length`;
      infos[lengthName] = 0;
      return function(str) {
        let length = (str || '').length;
        if (length > infos[lengthName]) infos[lengthName] = length;
      };
    }

    // Loop all methods' route info
    this.methods.forEach((route) => {
      props.forEach((prop) => {
        if (!infos[prop]) infos[prop] = [];
        let val = route[prop] || '';
        if (prop === 'verb') val = val.toUpperCase();
        infos[prop].push(val);
      });
    });

    // Find longtest description of each `prop`
    props.forEach((prop) => infos[prop].forEach(setMaxLength(prop)));

    // Print debug info of methods one by one
    let count = this.methods.length;
    debug(`All Methods: (${count})`);
    let i = 0;
    while(i < count) {
      let sentence = props.map((prop) => utils.padRight(infos[prop][i], infos[`${prop}Length`]));
      sentence.unshift('=>');
      debug(sentence.join(' '));
      i++;
    }
  }
};
