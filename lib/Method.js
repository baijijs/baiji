'use strict';

// Module dependencies
const assert = require('assert');
const EventEmitter = require('events');
const path = require('path');
const _ = require('lodash');
const utils = require('./utils');

// Constants
const SUPPORT_ADAPTER_NAMES = ['express', 'socketio', 'rpc'];
const REQUIRED_PARAM_KEYS = ['name'];

class Method extends EventEmitter {
  static create(name, options, fn) {
    return new Method(name, options, fn);
  }

  constructor(name, options, fn) {
    super();

    this.name = name || options.name;
    assert(typeof this.name === 'string', 'Method name must be a valid string');
    assert(typeof fn === 'function', 'Method fn must be a valid function');

    // Parent reference
    this.parent = null;

    // Stack to be executed, must be composed before server starts
    this.stack = null;

    // Main function
    this.fn = fn;

    // Method options
    this.options = options || {};

    // Parameters accpetance schema
    this._validateAndSetParams(options.params || options.accepts);

    // Set supported adapter(s)
    this._validateAndSetAdapters(options.adapters || options.adapter);

    // Method route config
    this._validateAndSetRoute(options.http || options.route);

    // Method description, notes for debug info and documentation usage
    this._validateAndSetDocumentation(options);

    this._determineWhetherHooksShouldBeSkiped();

    // TODO: Add built in multipart support
    this.upload = options.upload || {};

    // Extra attibutes that can be used by plugins to store cusmized data
    this.extra = options.extra || {};
  }

  // Validate whether params schema is valid
  _validateAndSetParams(params) {
    params = params || [];
    if (!Array.isArray(params)) params = [params];

    let errorMessages = [];
    let self = this;

    // Check params one by one
    _.each(params, function(param, i) {
      param = param || {};
      _.each(REQUIRED_PARAM_KEYS, function(key) {
        if (!param[key]) {
          errorMessages.push(
            `\`${key}\` is missing for params of \`${self.fullName()}\` method at position ${i}`
          );
        }
      });
    });

    if (errorMessages.length) {
      throw new Error(errorMessages.join('\n'));
    }

    this.params = params;
  }

  // Validate and set adapters
  _validateAndSetAdapters(adapters) {
    // Assign default adapters
    if (!adapters) adapters = ['all'];

    // Convert adapters into an array
    if (!Array.isArray(adapters)) adapters = [adapters];

    // If `all` is included, then add all supported adapters
    if (~adapters.indexOf('all')) {
      this.adapters = SUPPORT_ADAPTER_NAMES.slice();
    }
    // Else check whether adapter names are valid
    else {
      this.adapters = adapters;
      // check adapter validation
      _.each(this.adapters, function(adapter) {
        assert(
          ~SUPPORT_ADAPTER_NAMES.indexOf(adapter),
          `Invalid adapter name found: '${adapter}'`
        );
      });
    }
  }

  // Validate and set route config
  _validateAndSetRoute(route) {
    this.route = route || {};
    // Set default verb
    if (!this.route.verb) this.route.verb = 'all';

    // Lowercase verb
    this.route.verb = String(this.route.verb).toLowerCase();

    // Set default path
    if (!this.route.path) this.route.path = '/';
  }

  // Validate and set documentation related options
  _validateAndSetDocumentation(options) {
    this.description = options.description || options.desc || this.name;
    this.notes = options.notes;
    this.documented = options.documented !== false;
  }

  // Determine whether hooks should be skiped, expecially for middlewarified method
  _determineWhetherHooksShouldBeSkiped() {
    // Skip beforeHooks and afterHooks or not, default is `true` when route.verb is `use` otherwise `false`
    this.skipHooks = this.route.verb === 'use';
    if (this.options.skipHooks === true) {
      this.skipHooks = true;
    } else if (this.options.skipHooks === false) {
      this.skipHooks = false;
    }
  }

  // Check whether a method is support a specific adapter
  isSupport(adapterName) {
    return !!~this.adapters.indexOf(adapterName);
  }

  fullPath() {
    let segments = ['/'];
    if (this.parent && typeof this.parent.fullPath === 'function') {
      segments.push(this.parent.fullPath());
    }
    segments.push(this.route.path);
    return path.join.apply(path, segments);
  }

  clone() {
    let method = new Method(this.name, _.assign({}, this.options), this.fn);

    method.stack = null;
    method.adapters = this.adapters.slice();
    method.skipHooks = !!this.skipHooks;
    method.parent = this.parent;
    // use internal Object.assign to keep params as an array
    method.params = Object.assign([], this.params);
    method.description = this.description;
    method.notes = this.notes;
    method.documented = !!this.documented;
    method.route = _.assign({}, this.route);
    method.upload = _.assign({}, this.upload);
    method.extra = _.assign({}, this.extra);

    return method;
  }

  // Method fullname, including parent's fullname
  fullName() {
    if (this.parent && typeof this.parent.fullName === 'function') {
      return `${this.parent.fullName()}.${this.name}`;
    } else {
      return this.name;
    }
  }

  // Invoke method
  invoke() {
    assert(
      this.stack,
      `Method: '${this.fullName()}' must be composed before invoking`
    );

    return this.stack.apply(null, arguments);
  }

  // Compose hooks and method for stack manner
  compose(beforeStack, afterStack, afterErrorStack) {
    let stack = []
      .concat(this.skipHooks ? [] : (beforeStack || []))
      .concat(this.fn)
      .concat(this.skipHooks ? [] : (afterStack || []));

    let afterError = utils.compose(afterErrorStack || []);

    this.stack = utils.compose(stack, afterError);
  }
}

module.exports = Method;
