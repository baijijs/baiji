'use strict';

const magico = require('magico');

module.exports = class Context {
  constructor(req, res, method, options) {
    // Request reference
    this.request = this.req = req;
    // Response reference
    this.response = this.res = res;

    // Context options
    this.options = options || {};

    // Method instance reference
    this._method = method;

    // Method full name
    this.methodName = method.fullName();

    // Method full path
    this.fullPath = method.fullPath();

    // Build arguments for this context
    this.args = this.buildArgs();

    // Request finish mark
    this._done = false;

    // Recommended namespace for passing information across middlewares
    this.state = {};

    // Cicular reference for context
    this.request.context = this.response.context = this;
  }

  buildArgs() {
    return {};
  }

  param(name) {
    return magico.get(this.args, name);
  }

  // General send response method, should be overwritten
  done() {
    throw new Error('Not Implement');
  }
};
