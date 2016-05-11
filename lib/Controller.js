'use strict';

const path = require('path');
const assert = require('assert');
const utils = require('./utils');
const Method = require('./Method');

let RESERVED_METHODS = [];

class Controller {
  constructor(name) {
    this.parent = null;
    this.name = name || utils.getName();
    this.mountpath = '/';

    this.beforeHooks = {};
    this.afterHooks = {};
    this.afterErrorHooks = {};
    this._hooksConfig = {};
    this._hookNames = [];

    this.methods = [];

    this.methodOptions = {};

    this._detectMethodsAndCorrespondingOptions();
  }

  _detectMethodsAndCorrespondingOptions() {
    let ctrl = this;

    let propNames = Object.getOwnPropertyNames(ctrl.__proto__);

    // Get all props and check reserved words
    propNames.forEach((name) => {
      assert(!~RESERVED_METHODS.indexOf(name), `Method: ${name} is reserved by Controller, please rename it`);
    });

    // Get all possiable methods
    let methodNames = propNames.filter((name) => {
      if (name === 'constructor') return false;
      return !~ctrl._hookNames.indexOf(name);
    });

    // Generate hooks
    utils.hookTypes.forEach(function(type) {
      let key = `${type}Hooks`;

      for (let hookName in ctrl._hooksConfig[key]) {
        console.log(hookName);
        let options = ctrl._hooksConfig[key][hookName];
        let methods = methodNames.filter((name) => {
          if (~options.except.indexOf('*')) return false;
          if (~options.only.indexOf('*')) return true;

          if (~options.only.indexOf(name) && !~options.except.indexOf(name)) return true;
          return false;
        });

        utils.addHookByType(ctrl, type, methods, ctrl[hookName]);
      }
    });

    // Generate methods
  }

  setName(name) {
    this.name = name;
  }

  setMethodOptions(methodName, options) {
    options = options || {};
    options = Object.assign(options, this.methodOptions);
    if (typeof methodName === 'string') {
      this.methodOptions[methodName] = options;
    } else if (typeof methodName === 'object') {
      this.methodOptions = Object.assign(options, methodName);
    } else {
      assert(false, `Invalid method options ${options} for method ${methodName}`);
    }
  }

  before(hookName, options) {
    return this._setHook('before', hookName, options);
  }

  after(hookName, options) {
    return this._setHook('after', hookName, options);
  }

  afterError(hookName, options) {
    return this._setHook('afterError', hookName, options);
  }

  _setHook(type, hookName, options) {
    assert(
      typeof hookName === 'string' &&
      typeof this[hookName] === 'function',
      `No method named '${hookName}' defined`
    );

    if (!~this._hookNames.indexOf(hookName)) this._hookNames.push(hookName);

    let key = `${type}Hooks`;
    options = options || {};

    options.only = options.only || ['*'];
    options.except = options.except || ['*'];
    if (!Array.isArray(options.only)) options.only = [options.only];
    if (!Array.isArray(options.except)) options.except = [options.except];

    if (~options.only.indexOf('*')) options.only = ['*'];
    if (~options.except.indexOf('*')) options.except = ['*'];

    this._hooksConfig[key] = this._hooksConfig[key] || {};
    this._hooksConfig[key][hookName] = options;
    return this;
  }

  fullName() {
    return this.parent ? `${this.parent.fullName()}.${this.name}` : this.name;
  }

  fullPath() {
    let mountpath = this.mountpath || '/';
    return this.parent ? path.join(this.parent.fullPath(), mountpath) : mountpath;
  }
}

// Get Controller own property except for `constructor`
RESERVED_METHODS = Object.getOwnPropertyNames(Controller.prototype).slice(1);

module.exports = Controller;
