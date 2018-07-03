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
const DEFAULT_UPLOAD_OPTIONS = { fields: [{ name: 'file', maxCount: 1 }] };
const PARAMETER_ENGINES = {};

class Action extends EventEmitter {
  static create(name, options, handler) {
    return new Action(name, options, handler);
  }

  static registerParameterEngine(name, parser) {
    PARAMETER_ENGINES[name] = parser;
  }

  constructor(name, options, handler) {
    super();

    this.name = name || options.name;
    assert(typeof this.name === 'string', 'Action name must be a valid string');
    assert(typeof handler === 'function', 'Action handler must be a valid function');

    // Parent reference
    this.parent = null;

    // Stack to be executed, must be composed before server starts
    this.stack = null;

    // handler function
    this.handler = handler;

    // Action options
    this.options = options || {};

    // Parameters accpetance schema
    this._validateAndSetParams(options.params || options.accepts);

    // Set supported adapter(s)
    this._validateAndSetAdapters(options.adapters || options.adapter);

    // Action route config
    this._validateAndSetRoute(options.http || options.route);

    // Action description, notes for debug info and documentation usage
    this._validateAndSetDocumentation(options);

    this._determineWhetherHooksShouldBeSkiped();

    // File upload support: multipart/form-data
    this.upload = options.upload ? (
      options.upload === true ? DEFAULT_UPLOAD_OPTIONS : options.upload
    ) : false;

    // Extra attibutes that can be used by plugins to store customized data
    this.extra = options.extra || {};
  }

  // Validate whether params schema is valid
  _validateAndSetParams(params) {
    let errorMessages = [];
    let fullName = this.fullName();

    // let paramsEngine = params.

    function _buildParams(params, index) {
      index = index || '';
      params = params || [];
      if (!Array.isArray(params)) params = [params];

      _.each(params, function(param, i) {
        param = _.assign({}, param);

        _.each(REQUIRED_PARAM_KEYS, function(key) {
          if (!param[key]) {
            errorMessages.push(
              `\`${key}\` is missing for params of \`${fullName}\` action at position ${index}[${i}]`
            );
          }
        });

        // Check inner params
        if (param.params) {
          param.params = _buildParams(param.params, `[${i}].params`);
        }

        params[i] = param;
      });

      return params;
    }

    // Check params one by one
    params = _buildParams(params);

    // Throw out errors
    if (errorMessages.length) throw new Error(errorMessages.join('\n'));

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

  // Determine whether hooks should be skiped, expecially for middlewarified action
  _determineWhetherHooksShouldBeSkiped() {
    // Skip beforeHooks and afterHooks or not, default is `true` when route.verb is `use` otherwise `false`
    this.skipHooks = this.route.verb === 'use';
    if (this.options.skipHooks === true) {
      this.skipHooks = true;
    } else if (this.options.skipHooks === false) {
      this.skipHooks = false;
    }
  }

  // Check whether a action is support a specific adapter
  isSupport(adapterName) {
    return !!~this.adapters.indexOf(adapterName);
  }

  fullPath() {
    if (this._fullPath) return this._fullPath;

    let segments = ['/'];
    if (this.parent && typeof this.parent.fullPath === 'function') {
      segments.push(this.parent.fullPath());
    }
    segments.push(this.route.path);
    return path.posix.join.apply(path, segments);
  }

  clone() {
    let action = new Action(this.name, _.assign({}, this.options), this.handler);

    action.stack = null;
    action.adapters = this.adapters.slice();
    action.skipHooks = !!this.skipHooks;
    action.parent = this.parent;
    // use internal Object.assign to keep params as an array
    action.params = Object.assign([], this.params);
    action.description = this.description;
    action.notes = this.notes;
    action.documented = !!this.documented;
    action.route = _.assign({}, this.route);
    action.upload = this.upload ? _.assign({}, this.upload) : this.upload;
    action.extra = _.assign({}, this.extra);

    // Copy all events
    utils.copyEvents(this, action);

    return action;
  }

  // Action fullname, including parent's fullname
  fullName() {
    if (this._fullName) return this._fullName;

    if (this.parent && typeof this.parent.fullName === 'function') {
      return `${this.parent.fullName()}.${this.name}`;
    } else {
      return this.name;
    }
  }

  // Invoke action
  invoke() {
    assert(
      this.stack,
      `Action: '${this.fullName()}' must be composed before invoking`
    );

    return this.stack.apply(null, arguments);
  }

  // Compose hooks and action for stack manner
  compose(beforeStack, afterStack, afterErrorStack) {
    let stack = []
      .concat(this.skipHooks ? [] : (beforeStack || []))
      .concat(this.handler)
      .concat(this.skipHooks ? [] : (afterStack || []));

    let afterError = utils.compose(afterErrorStack || []);

    this.stack = utils.compose(stack, afterError);
  }
}

module.exports = Action;
