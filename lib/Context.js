'use strict';

const _ = require('lodash');
const createError = require('http-errors');
const normalizer = require('baiji-normalizer');
const assert = require('assert');
const Method = require('./Method');

// Build args by context, parameters defination and raw arguments
function _buildArgs(ctx, params, rawArgs) {
  params = params || [];
  let args = {};

  let i;
  // build arguments from req and method options
  for (i = 0; i < params.length; i++) {
    let o = params[i];
    let name = o.name || o.arg;
    let val;
    let type = o.type || 'any';

    // This is an http method keyword, which requires special parsing.
    if (o.value != null) {
      if (typeof o.value === 'function') {
        val = o.value(ctx);
      } else {
        val == _.clone(o.value);
      }
    } else {
      val = _.get(rawArgs, name);
    }

    // Try to convert value
    val = normalizer.tryConvert(val, type, ctx.options);

    // Parse inner parameters
    if (o.params) {
      if (_.isArray(type)) {
        val = _.map(val, function(v) {
          return _buildArgs(ctx, o.params, v);
        });
      } else {
        val = _buildArgs(ctx, o.params, val);
      }
    }

    // Set default value
    if (val == null && o.hasOwnProperty('default')) {
      val = o.default;
    }

    // set the argument value
    args[name] = val;
  }

  return args;
}

module.exports = class Context {
  constructor(req, res, method, options) {
    assert(req, 'req is invalid');
    assert(res, 'res is invalid');
    assert(method instanceof Method, 'method must be an instance of Method');

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
      delims = new RegExp(_.map(delims, _.escapeRegExp).join('|'), 'g');
      this.options.arrayItemDelimiters = delims;
    }
  }

  buildArgs() {
    let ctx = this;

    // Prevent rebuilt
    if (this.argsBuilt) return this.args;

    // Params config
    const params = ctx._method.params || [];

    // Build args
    let args = _buildArgs(ctx, params, this.args);

    // Mark args as built
    this.argsBuilt = true;
    this.args = args;

    return args;
  }

  param(name) {
    return _.get(this.args, name);
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
