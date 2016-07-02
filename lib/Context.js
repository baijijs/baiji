'use strict';

module.exports = class Context {
  constructor(req, res, method, options) {
    this.request = this.req = req;
    this.response = this.res = res;

    this.options = options || {};
    this._method = method;
    this.methodName = method.fullName();
    this.fullPath = method.fullPath();
    this.args = this.buildArgs();

    this._done = false;

    // Recommended namespace for passing information through middleware
    this.state = {};

    // Cicular reference for context
    this.request.context = this.response.context = this;
  }

  buildArgs() {
    return {};
  }

  param(name) {
    return this.args[name];
  }

  done() {}
};
