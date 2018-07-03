'use strict';

const _ = require('lodash');
const EventEmitter = require('events');
const createError = require('http-errors');
const assert = require('assert');
const Action = require('./Action');
const buildArgs = require('./utils/buildArgs');

module.exports = class Context extends EventEmitter {
  constructor(req, res, action, options) {
    super();

    assert(req, 'req is invalid');
    assert(res, 'res is invalid');
    assert(action instanceof Action, 'action must be an instance of Action');

    // Request reference
    this.request = this.req = req;
    // Response reference
    this.response = this.res = res;

    // Context options
    this.options = options || {};

    // Action instance reference
    this.action = action;

    // Action full name
    this.actionName = action.fullName();

    // Action full path
    this.fullPath = action.fullPath();

    // Mark args as unbuilt according to options.argsBuilt
    this.argsBuilt = options.argsBuilt || false;

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

    // Add default error listener to avoid error thrown directly
    this._applyDefaultErrorListener();
  }

  _applyDefaultErrorListener() {
    if (!this.listeners('error').length) {
      this.on('error', _.noop);
    }
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

  setArgs(args, needsBuilt) {
    if (needsBuilt) {
      this.argsBuilt = false;
      this.args = args;
      this.buildArgs();
    } else {
      this.args = args;
      this.argsBuilt = true;
    }

    return this;
  }

  buildArgs() {
    let ctx = this;

    // Prevent rebuilt
    if (this.argsBuilt) return this.args;

    // Params config
    const params = ctx.action.params || [];

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

  // Check whether `ctx` is a mock context
  isMock() {
    return this._isMock;
  }

  // Mark a context as mock
  markAsMock() {
    this._isMock = true;
    return this;
  }

  // Alias `done()`
  respond() {
    return this.done.apply(this, arguments);
  }

  // General send response method, should be overwritten
  done() {
    throw new Error('Not Implement');
  }
};
