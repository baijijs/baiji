'use strict';

// Module dependencies
const assert = require('assert');
const _ = require('lodash');
const utils = require('./utils');

const Base = require('./Base');
const Schema = require('./Schema');

// Constants
const SUPPORT_ADAPTER_NAMES = ['express', 'socketio', 'rpc'];
const DEFAULT_UPLOAD_OPTIONS = { fields: [{ name: 'file', maxCount: 1 }] };

/**
 * Action Class
 */
class Action extends Base {
  static create(nameOrAction, options, handler) {
    if (nameOrAction instanceof Action) return nameOrAction.clone();
    return new Action(nameOrAction, options, handler);
  }

  /**
   * Represents an action.
   * @constructor
   * @param {String} name - The name of the action
   * @param {Object} options - The options of an action
   * @param {String} options.name - The name of an action, will be used when name is empty
   * @param {Object} options.params - The parameters schema that an action can accepted
   * @param {Object} options.route - Route config for action
   * @param {String} options.route.verb - HTTP verb for route
   * @param {String} options.route.path - Path for route
   * @param {Object} options.mock - Mock response data for action
   * @param {Boolean} options.deprecated - Mark this action as deprecated
   * @param {String[]} options.adapters - Indicate adapters that this action supports
   * @param {String} options.description - Action description
   * @param {String} options.notes - Action notes
   * @param {Boolean} options.skipHooks - Mark this action whether should skip all hooks
   * @param {Object} options.upload - Upload config
   * @param {Object} options.extra - Extra infomation for some special use cases
   * @param {Function} handler - Main handler for this action
   */
  constructor(name, options, handler) {
    super();

    this.name = name || options.name;
    assert(typeof this.name === 'string', 'Action name must be a valid string');

    // Mock response data
    this.mock = options.mock ? _.clone(options.mock) : null;
    assert(
      typeof handler === 'function' || this.mock != null,
      'Action handler must be a valid function'
    );

    // handler function or mock response
    this.handler = utils.wrapperFn(handler || utils.mockResponse(this.mock));

    // Action options
    this.options = options || {};

    // Stack to be executed, must be composed before server starts
    this.stack = null;

    // Stack to be executed before sending response
    this.beforeRespondStack = null;

    // Parameters accpetance schema
    let params = options.params || options.accepts;
    this.params = params ?
      Schema.from(params, { validate: options.validate }) :
      null;

    // Indicates that the action is deprecated, and will be removed in the future
    this.deprecated = options.deprecated === true;

    // Set supported adapter(s)
    this._validateAndSetAdapters(options.adapters || options.adapter);

    // Action route config
    this._validateAndSetRoute(options.route);

    // Action description, notes for debug info and documentation usage
    this._validateAndSetDocumentation(options);

    this._determineWhetherHooksShouldBeSkiped(options.skipHooks);

    // File upload support: multipart/form-data
    this._applyDefaultUploadOptions(options.upload);

    // Extra attibutes that can be used by plugins to store customized data
    this.extra = options.extra ? _.clone(options.extra) : Object.create(null);
  }

  // Auto detect files from params
  _applyDefaultUploadOptions(opts) {
    let files = this.params ? this.params.pathsByType('file') : {};
    let upload = false;

    if (opts) {
      if (opts === true) {
        upload = Object.assign({}, DEFAULT_UPLOAD_OPTIONS);
      } else {
        upload = Object.assign({}, opts);
      }

      let fields = _.map(files, file => {
        return { name: file.path, maxCount: file.maxCount };
      });

      _.each(upload.fields, field => {
        field = field || {};
        if (field.name && !files[field.name]) fields.push(field);
      });

      upload.fields = fields;
    }

    this.upload = upload;
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

  // Validate and set routes config
  // { verb: 'post,get', path: '/users/sign_in' } parsed as 👇
  // { verb: ['post', 'get'], path: '/users/sign_in' }
  _validateAndSetRoute(route) {
    route = route || {};

    let verb = route.verb || 'all';
    verb = Array.isArray(verb) ? verb : verb.split(',');
    verb = verb.map(function(v) { return v.trim().toLowerCase(); });

    assert(
      verb.indexOf('use') === -1 || verb.length <= 1,
      `Invalid action(${this.fullName}) route verb detected: \`use\` can't be used with other http methods`
    );

    // Set mountPath
    let mountPath = route.path || '/';
    this.mountPath = mountPath;

    this.route = { verb, path: mountPath };
  }

  // Validate and set documentation related options
  _validateAndSetDocumentation(options) {
    this.description = options.description || options.desc || this.name;
    this.notes = options.notes;
    this.documented = options.documented !== false;
  }

  // Determine whether hooks should be skiped, expecially for middlewarified action
  _determineWhetherHooksShouldBeSkiped(skipHooks) {
    // Skip beforeHooks and afterHooks or not, default is `true` when route.verb is `use` otherwise `false`
    this.skipHooks = this.route.verb.indexOf('use') !== -1;
    if (skipHooks === true || skipHooks === false) {
      this.skipHooks = skipHooks;
    }
  }

  // Check whether a action is support a specific adapter
  isSupport(adapterName) {
    return !!~this.adapters.indexOf(adapterName);
  }

  // Check action name
  is(name = '') {
    if (this.name === name) return true;

    let fullName = this.fullName;
    if (fullName === name) return true;

    let index = fullName.indexOf(name);
    if (index === -1) return false;
    if (fullName.slice(index, fullName.length) === name) return true;

    return false;
  }

  clone() {
    let action = new Action(
      this.name,
      _.assign({}, this.options),
      this.handler
    );

    // Set parent
    action.parent = this.parent;

    // Copy all events from source to target
    utils.copyEvents(this, action);

    return action;
  }

  // Invoke action
  invoke() {
    assert(
      this.stack,
      `Action: '${this.fullName}' must be composed before invoking`
    );

    return this.stack.apply(null, arguments);
  }

  // Invoke before respond action
  invokeBeforeRespond() {
    assert(
      this.beforeRespondStack,
      `Action: '${this.fullName}' must be composed before invoking before responding action`
    );

    return this.beforeRespondStack.apply(null, arguments);
  }

  // Compose hooks and action for stack manner
  //    hooks = { before, after, error, beforeRespond }
  compose(hooks = {}) {
    const {
      before        = [],
      after         = [],
      error         = [],
      beforeRespond = []
    } = hooks;

    const stack = []
      .concat(this.skipHooks ? [] : before)
      .concat(this.handler)
      .concat(this.skipHooks ? [] : after);

    // Compose error handler
    const onError = utils.compose(error);

    // Main stack
    this.stack = utils.compose(stack, onError);

    // Before respond stack
    this.beforeRespondStack = utils.compose(beforeRespond, onError);
  }
}

module.exports = Action;
