'use strict';

const assert = require('assert');
const EventEmitter = require('events');
const utils = require('./utils');

let RESERVED_METHODS = [];

// Route method for adding routes config for both Controller and its instance
const route = function route(proto, nameOrRoutes, methodConfig) {
  if (!proto.__routes) proto.__routes = {};
  if (typeof nameOrRoutes === 'string') {
    // Set new routes
    if (typeof methodConfig === 'object') {
      proto.__routes = Object.assign(proto.__routes, { [nameOrRoutes]: methodConfig });
    }

    // Get route config
    else {
      return proto.__routes[nameOrRoutes];
    }
  }

  // Overwrite all routes
  else if (typeof nameOrRoutes === 'object') {
    proto.__routes = nameOrRoutes;
  }
};

class Controller extends EventEmitter {

  // Static route method
  static route(nameOrRoutes, methodConfig) {
    return route(this.prototype, nameOrRoutes, methodConfig);
  }

  constructor(name) {
    super();

    this.parent = null;
    this.name = name || utils.getName();
    this.mountpath = '/';

    this.__hooksConfig = Object.assign({}, this.__hooksConfig);
    this.__routes = Object.assign({}, this.__routes);

    // Check reserved instance methods
    this.__detectConflictMethods();

    // Init routes
    if (typeof this.initRoutes === 'function') {
      let routesConfig = this.initRoutes();
      if (typeof routesConfig === 'object') {
        this.route(routesConfig);
      }
    }
  }

  initRoutes() { /* Will be called when initialized */ }

  __detectConflictMethods() {
    let instance = this;

    let propNames = Object.getOwnPropertyNames(instance.__proto__);

    // Get all props and check reserved words
    propNames.forEach((name) => {
      assert(!~RESERVED_METHODS.indexOf(name), `Method: ${name} is reserved by baiji.Controller, please rename it`);
    });
  }

  setName(name) {
    this.name = name;
  }

  getName() {
    return this.name;
  }

  setMountPath(path) {
    this.mountpath = path;
  }

  getMountPath() {
    return this.mountpath || '/';
  }

  // Set routes
  // this.route('index', { description: 'list api', http: { path: '/', verb: 'get' } })
  route(nameOrRoutes, methodConfig) {
    return route(this, nameOrRoutes, methodConfig);
  }

  get preRequest() {
    return (hooks) => this.__hookProxy('preRequest', 'beforeAction', hooks);
  }

  set preRequest(hooks) {
    this.__hookProxy('preRequest', 'beforeAction', hooks);
  }

  get postRequest() {
    return (hooks) => this.__hookProxy('postRequest', 'afterAction', hooks);
  }

  set postRequest(hooks) {
    this.__hookProxy('postRequest', 'afterAction', hooks);
  }

  get onRequestError() {
    return (hooks) => this.__hookProxy('onRequestError', 'afterErrorAction', hooks);
  }

  set onRequestError(hooks) {
    this.__hookProxy('onRequestError', 'afterErrorAction', hooks);
  }

  beforeAction(nameOrFn, options) {
    return this.__setHook('before', nameOrFn, options);
  }

  afterAction(nameOrFn, options) {
    return this.__setHook('after', nameOrFn, options);
  }

  afterErrorAction(nameOrFn, options) {
    return this.__setHook('afterError', nameOrFn, options);
  }

  __hookProxy(targetMethodName, methodName, hooks) {
    if (!hooks) hooks = [];
    if (!Array.isArray(hooks)) hooks = [hooks];

    hooks.forEach((hook) => {
      assert(Array.isArray(hook), `Invalid ${methodName} config: ${hooks}`);
      this[methodName].apply(this, hook);
    });
  }

  __setHook(type, nameOrFn, options) {
    let name;
    let fn;

    // Support `__setHook('before', 'signInRequired', {})`
    if (typeof nameOrFn === 'string') {
      name = nameOrFn;
      fn = this[nameOrFn];
      assert(typeof fn === 'function', `No method named '${nameOrFn}' defined`);
    }

    // Support `__setHook('before', function(ctx, next) {}, {})`
    else if (typeof nameOrFn === 'function') {
      name = utils.getName(nameOrFn);
      fn = nameOrFn;
    } else {
      assert(false, `Invalid ${type} ${nameOrFn}`);
    }

    // Bind `this` context to fn
    fn = fn.bind(this);

    options = options || {};

    // Hook will apply to all methods by default
    options.only = options.only || ['*'];
    options.except = options.except || [];

    // Convert `options.only` and `options.except` to array
    if (!Array.isArray(options.only)) options.only = [options.only];
    if (!Array.isArray(options.except)) options.except = [options.except];

    // If `options.only` contains wildcard `*` then remove useless restrictions
    if (~options.only.indexOf('*')) options.only = ['*'];
    // If `options.except` contains wildcard `*` then remove useless restrictions
    if (~options.except.indexOf('*')) options.except = ['*'];

    // Add hook config
    if (!this.__hooksConfig[type]) this.__hooksConfig[type] = {};
    this.__hooksConfig[type][name] = { fn, options };

    // Allow method chain
    return this;
  }
}

// Get Controller own property except for `constructor`
RESERVED_METHODS = Object.getOwnPropertyNames(Controller.prototype).slice(1);

module.exports = Controller;
