'use strict';

const _ = require('lodash');
const EventEmitter = require('events');
const createError = require('http-errors');
const assert = require('assert');
const Method = require('./Method');
const buildArgs = require('./utils/buildArgs');

module.exports = class Context extends EventEmitter {
  constructor(req, res, method, options) {
    super();

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

    // Whether Context is a mock context or not
    this._isMock = false;

    // Response data will be saved in this property
    this.result = undefined;

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

  setArgs(args) {
    this.argsBuilt = true;
    this.args = args;
  }

  buildArgs() {
    let ctx = this;

    // Prevent rebuilt
    if (this.argsBuilt) return this.args;

    // Params config
    const params = ctx._method.params || [];

    // Build args
    let args = buildArgs(ctx, params, this.args, !this._isMock);

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
