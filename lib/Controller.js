'use strict';

const EventEmitter = require('events');
const utils = require('./utils');
const Method = require('./Method');

module.exports = Controller;

class Controller extends EventEmitter {
  constructor(name, options) {
    super();

    if (!(this instanceof Controller)) return new Controller(name, options);

    this._name = name;
    this._options = options || {};
    this._beforeActions = [];
    this._afterActions = [];
    this._afterErrorActions = [];
    this._methods = [];
  }

  define(method) {
    if (method instanceof Method) {
      this._methods.push(method);
    } else {
      this._methods.push(Method.apply(null, arguments));
    }
    return this;
  }

  extend() {
    let ctrl = Controller();
    ctrl._name = this._name;
    ctrl._options = Object.assign(this._options);
    ctrl._beforeActions = this._beforeActions.slice();
    ctrl._afterActions = this._afterActions.slice();
    ctrl._afterErrorActions = this._afterErrorActions.slice();
    ctrl._methods = this._methods.slice();

    return ctrl;
  }

  set(key, value) {
    this.options[key] = value;
  }
}

utils.addHookMethod(Controller.prototype, 'before');
utils.addHookMethod(Controller.prototype, 'after');
utils.addHookMethod(Controller.prototype, 'afterError');
