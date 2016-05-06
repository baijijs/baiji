'use strict';

module.exports = class Context {
  constructor(req, res, method, options) {
    this.request = Object.create(req);
    this.req = req;
    this.response = Object.create(res);
    this.res = res;

    this.options = options || {};
    this._method = method;
    this.methodName = method.fullName();
    this.args = this.buildArgs();

    this._done = false;

    this.state = {};

    this.request.context = this.response.context = this;
  }

  buildArgs() {
    return {};
  }

  getArgByName(name) {
    return this.args[name];
  }

  done() {}
};
