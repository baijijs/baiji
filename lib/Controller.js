'use strict';

const utils = require('./utils');
const Method = require('./Method');

module.exports = Controller;

class Controller {
  constructor() {
    this.parent = null;
    this.name = '';
    this.mountPath = '/';

    this.beforeHooks = {};
    this.afterHooks = {};
    this.afterErrorHooks = {};
  }

  setName(name) {
    this.name = name;
  }

  setMountPath(mountPath) {
    this.mountPath = mountPath;
  }

  before(hookName, options) {

  }

  skipBefore(hookName, options) {

  }

  after(hookName, options) {

  }

  fullName() {
    return this.parent ? `${this.parent.fullName()}.${this.name}` : this.name;
  }
}

utils.addHookMethod(Controller.prototype, 'before');
utils.addHookMethod(Controller.prototype, 'after');
utils.addHookMethod(Controller.prototype, 'afterError');
