'use strict';

const magico = require('magico');
const createError = require('http-errors');
const normalizer = require('baiji-normalizer');
const utils = require('./utils');

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

    // Mark args as unbuilt
    this.argsBuilt = false;

    // Init args
    this.args = {};

    // Request finish mark
    this._done = false;

    // Recommended namespace for passing information across middlewares
    this.state = {};

    // Cicular reference for context
    this.request.context = this.response.context = this;

    // Prepare extra options
    this._prepareExtraOpts();
  }

  _prepareExtraOpts() {
    // Construct delimiter regex if input was an array. Overwrite option
    // so this only needs to happen once.
    let delims = this.options.arrayItemDelimiters;
    if (Array.isArray(delims)) {
      delims = new RegExp(delims.map(utils.escapeRegExp).join('|'), 'g');
      this.options.arrayItemDelimiters = delims;
    }
  }

  buildArgs() {
    if (this.argsBuilt) return ctx.args;

    let args = {};
    let ctx = this;
    const params = ctx._method.params || [];

    let i;
    // build arguments from req and method options
    for (i = 0; i < params.length; i++) {
      let o = params[i];
      let valueOrFn = o.value;
      let name = o.name || o.arg;
      let val;
      let type = o.type || 'any';

      // This is an http method keyword, which requires special parsing.
      if (valueOrFn != null) {
        if (typeof valueOrFn === 'function') {
          val = valueOrFn(ctx);
        } else {
          val == valueOrFn;
        }
      } else {
        val = ctx.param(name);
        if (normalizer.canConvert(type)) {
          val = normalizer.convert(val, type, ctx.options);
        }
      }

      // Set default value
      if (val == null && o.hasOwnProperty('default')) {
        val = o.default;
      }

      // set the argument value
      args[name] = val;
    }

    // Mark args as built
    this.argsBuilt = true;

    return args;
  }

  param(name) {
    return magico.get(this.args, name);
  }

  throw() {
    throw createError.apply(null, arguments);
  }

  // Check whether response has been sent
  isFinished() {
    throw new Error('Not Implement');
  }

  // General send response method, should be overwritten
  done() {
    throw new Error('Not Implement');
  }
};
