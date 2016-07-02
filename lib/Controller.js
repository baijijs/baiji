'use strict';

const assert = require('assert');
const utils = require('./utils');

let RESERVED_METHODS = [];

const route = function route(proto, nameOrRoutes, methodConfig) {
  if (!proto.__routes) proto.__routes = {};
  if (typeof nameOrRoutes === 'string') {
    if (typeof methodConfig === 'object') {
      proto.__routes = Object.assign(proto.__routes, { [nameOrRoutes]: methodConfig });
    } else {
      return proto.__routes[nameOrRoutes];
    }
  } else if (typeof nameOrRoutes === 'object') {
    proto.__routes = nameOrRoutes;
  }
};

class Controller {
  static route(nameOrRoutes, methodConfig) {
    return route(this.prototype, nameOrRoutes, methodConfig);
  }

  constructor(name) {
    this.parent = null;
    this.name = name || utils.getName();
    this.mountpath = '/';

    this.__hooksConfig = {};
    this.__routes = Object.assign({}, this.__routes);

    this.__detectConflictMethods();
  }

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

  setMountPath(path) {
    this.mountpath = path;
  }

  // Set routes
  // this.route('index', { description: 'list api', http: { path: '/', verb: 'get' } })
  route(nameOrRoutes, methodConfig) {
    return route(this, nameOrRoutes, methodConfig);
  }

  set preRequest(hooks) {
    this.__hookProxy('preRequest', 'beforeAction', hooks);
  }

  set postRequest(hooks) {
    this.__hookProxy('postRequest', 'afterAction', hooks);
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

    if (typeof nameOrFn === 'string') {
      name = nameOrFn;
      fn = this[nameOrFn];
      assert(typeof fn === 'function', `No method named '${nameOrFn}' defined`);
    } else if (typeof nameOrFn === 'function') {
      name = utils.getName(nameOrFn);
      fn = nameOrFn;
    } else {
      assert(false, `Invalid ${type} ${nameOrFn}`);
    }

    options = options || {};

    options.only = options.only || ['*'];
    options.except = options.except || [];

    if (!Array.isArray(options.only)) options.only = [options.only];
    if (!Array.isArray(options.except)) options.except = [options.except];

    if (~options.only.indexOf('*')) options.only = ['*'];
    if (~options.except.indexOf('*')) options.except = ['*'];

    this.__hooksConfig[type] = this.__hooksConfig[type] || {};
    this.__hooksConfig[type][name] = { fn, options };
    return this;
  }
}

// Get Controller own property except for `constructor`
RESERVED_METHODS = Object.getOwnPropertyNames(Controller.prototype).slice(1);

module.exports = Controller;
