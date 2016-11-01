'use strict';

const assert = require('assert');
const magico = require('magico');
const EventEmitter = require('events');
const utils = require('./utils');
const path = require('path');

const OVERWRITEABLE_METHODS = ['constructor'];
const RESERVED_METHODS = [];

// Route method for adding routes config for both Controller and its instance
const configure = function configure(proto, nameOrConfigs, methodConfig) {
  if (!proto.__configs) proto.__configs = {};
  if (typeof nameOrConfigs === 'string') {
    // Set new configs
    if (typeof methodConfig === 'object') {
      proto.__configs = Object.assign(
        proto.__configs,
        { [nameOrConfigs]: methodConfig }
      );
    }

    // Get config
    else {
      return proto.__configs[nameOrConfigs];
    }
  }

  // Overwrite all configs
  else if (typeof nameOrConfigs === 'object') {
    proto.__configs = nameOrConfigs;
  }
};

/**
 * General Controller class
 */
class Controller extends EventEmitter {

  // Static config method
  static configure(nameOrConfigs, methodConfig) {
    return configure(this.prototype, nameOrConfigs, methodConfig);
  }

  constructor(name) {
    super();

    // Parent reference
    this.parent = null;

    // Controller name
    this.name = name || utils.getName();

    // Controller base path
    this.basePath = '/';

    // Controller mountPath
    this.mountPath = '/';

    // Combile hooksConfig from prototype.__hooksConfig
    this.__hooksConfig = Object.assign({}, this.__hooksConfig);

    // Combine routes from prototype.__configs
    this.__configs = Object.assign({}, this.__configs);

    // Check reserved instance methods
    this.__detectConflictMethods();

    // Init routes
    const initConfig = this.initConfig || this.initRoutes;
    if (typeof initConfig === 'function') {
      let config = initConfig();
      if (typeof config === 'object') {
        this.configure(config);
      }
    }
  }

  /**
   * Detect whether user defined methods unexpectedly overwritten reserved methods
   * Error will throw out if any confliction found
   */
  __detectConflictMethods() {
    let instance = this;

    let propNames = Object.getOwnPropertyNames(instance.__proto__);

    // Get all props and check reserved words
    propNames.forEach((name) => {
      assert(
        !~RESERVED_METHODS.indexOf(name),
        `Method: \`${name}\` is reserved by baiji.Controller, please rename it`
      );
    });
  }

  // Set controller name
  setName(name) {
    this.name = name;
  }

  // Get controller name
  getName() {
    return this.name;
  }

  // Set controller base path
  setBasePath(path) {
    this.basePath = path;
  }

  // Get controller base path
  getBasePath() {
    return this.basePath || '/';
  }

  // Set controller mountPath
  setMountPath(path) {
    this.mountPath = path;
  }

  // Get controller mountPath
  getMountPath() {
    return path.join(this.getBasePath(), this.mountPath || '/');
  }

  // Set configs
  // this.configure('index', { desc: 'list api', route: { path: '/', verb: 'get' } })
  configure(nameOrConfigs, methodConfig) {
    return configure(this, nameOrConfigs, methodConfig);
  }

  get preRequest() {
    return hooks => this.preRequest = hooks;
  }

  set preRequest(hooks) {
    this.__hookProxy('beforeAction', hooks);
  }

  get postRequest() {
    return hooks => this.postRequest = hooks;
  }

  set postRequest(hooks) {
    this.__hookProxy('afterAction', hooks);
  }

  get onRequestError() {
    return hooks => this.onRequestError = hooks;
  }

  set onRequestError(hooks) {
    this.__hookProxy('afterErrorAction', hooks);
  }

  /**
   * Proxy hook configuration to specific hook method
   *
   * Examples:
   *   __hookProxy('beforeAction', [
   *     'signInRequired',
   *     ['checkAuthority', { only: 'profile' }],
   *     function(ctx, next) { 'YOUR_OWN_LOGIC' }
   *     [function(ctx, next) { 'YOUR_OWN_LOGIC' }, { except: ['update', 'create'] }]
   *   ])
   *
   * @param {string} hookActionName
   * @param {array} hooks
   * @private
   */
  __hookProxy(hookActionName, hooks) {
    if (!hooks) hooks = [];
    if (!Array.isArray(hooks)) hooks = [hooks];

    hooks.forEach((hook) => {
      this[hookActionName].apply(this, Array.isArray(hook) ? hook : [hook]);
    });
  }

  // Set before hook, see `__setHook` method
  beforeAction(nameOrFn, options) {
    return this.__setHook('before', nameOrFn, options);
  }

  // Set after hook, see `__setHook` method
  afterAction(nameOrFn, options) {
    return this.__setHook('after', nameOrFn, options);
  }

  // Set afterError hook, see `__setHook` method
  afterErrorAction(nameOrFn, options) {
    return this.__setHook('afterError', nameOrFn, options);
  }

  // Skip before hook
  skipBeforeAction(nameOrFn, options) {
    return this.__skipHook('before', nameOrFn, options);
  }

  // Skip after hook
  skipAfterAction(nameOrFn, options) {
    return this.__skipHook('after', nameOrFn, options);
  }

  // Skip after error hook
  skipAfterErrorAction(nameOrFn, options) {
    return this.__skipHook('afterError', nameOrFn, options);
  }

  /**
   * Skip target hook according to options
   * @private
   */
  __skipHook(type, name, skipOptions) {
    assert(typeof name === 'string', `Invalid method name '${name}'`);

    let hook = magico.get(this.__hooksConfig, `${type}.${name}`);
    if (!hook) return this;

    // Parse options
    skipOptions = this.__optionParser(skipOptions);

    // Filter onlies according to skipOptions
    let onlies = [];
    (magico.get(hook, 'options.only') || []).forEach(function(name) {
      if (~skipOptions.except.indexOf('*') || ~skipOptions.except.indexOf(name)) {
        onlies.push(name);
      } else if (~skipOptions.only.indexOf('*') || ~skipOptions.only.indexOf(name)) {
        return;
      } else {
        onlies.push(name);
      }
    });

    // Filter excepts according to skipOptions
    let excepts = [];
    (magico.get(hook, 'options.except') || []).forEach(function(name) {
      if (~skipOptions.except.indexOf('*') || ~skipOptions.except.indexOf(name)) {
        return;
      } else {
        excepts.push(name);
      }
    });

    // Overwrite hook config
    this.__hooksConfig[type][name] = { fn: hook.fn, only: onlies, except: excepts };

    // Allow method chain
    return this;
  }

  /**
  * Set hook according to type, name or function, and options.
  *
  * Add hook config into `__hooksConfig` by type, such as `before`, `after`, `afterError`.
  *
  * Hook can be added by function or its name, if name was passed, the function will
  * be searched from in this controller's instance.
  *
  * Options can accept two parameters: `only` and `except`. Note that `except` has higher
  * priority compare to `only`.
  *
  * Examples:
  *
  *   __setHook('before', 'signInRequired')
  *   __setHook('before', 'signInRequired', { only: 'my-articles' })
  *   __setHook('before', 'signInRequired', { only: ['my-articles'] })
  *   __setHook('before', 'signInRequired', { except: 'sign-in' })
  *   __setHook('before', 'signInRequired', { except: ['sign-in', 'sign-up'] })
  *
  * @param {string} type
  * @param {string|function} nameOrFn
  * @param {object} [options]
  * @param {string|array} [options.only]
  * @param {string|array} [options.except]
  * @return {this}
  * @private
  */
  __setHook(type, nameOrFn, options) {
    let name;
    let fn;

    // Support `__setHook('before', 'signInRequired', {})`
    if (typeof nameOrFn === 'string') {
      name = nameOrFn;
      fn = this[nameOrFn];
      assert(typeof fn === 'function', `No method named '${nameOrFn}' defined`);
    }

    // Support `__setHook('before', function(ctx, next) {}, {})`
    else if (typeof nameOrFn === 'function') {
      name = utils.getName(nameOrFn);
      fn = nameOrFn;
    } else {
      assert(false, `Invalid ${type} ${nameOrFn}`);
    }

    // Bind `this` context to fn, which will allow internal methods can be called
    // within controller instance
    fn = fn.bind(this);

    // Parse options
    options = this.__optionParser(
      options,
      magico.get(this.__hooksConfig, `${type}.${name}.options`)
    );

    // Add hook config
    // Example: { fn: function(ctx, next) {}, options: { excepts: [], only: [] } }
    if (!this.__hooksConfig[type]) this.__hooksConfig[type] = {};
    this.__hooksConfig[type][name] = { fn, options };

    // Allow method chain
    return this;
  }

  __optionParser(options, prevOpts) {
    options = options || {};

    // Hook will apply to all methods by default
    options.only = options.only || ['*'];
    options.except = options.except || [];

    // Convert `options.only` and `options.except` to array
    if (!Array.isArray(options.only)) options.only = [options.only];
    if (!Array.isArray(options.except)) options.except = [options.except];

    // Merge same hooks' options
    options.only = options.only.concat(magico.get(prevOpts, 'only') || []);
    options.except = options.except.concat(magico.get(prevOpts, 'except') || []);

    // If `options.only` contains wildcard `*` then remove useless restrictions
    if (~options.only.indexOf('*')) options.only = ['*'];

    // If `options.except` contains wildcard `*` then remove useless restrictions
    if (~options.except.indexOf('*')) options.except = ['*'];

    return options;
  }
}

// Get Controller own property except for `constructor` and `initRoutes`
Object.getOwnPropertyNames(Controller.prototype).forEach(name => {
  if (!~OVERWRITEABLE_METHODS.indexOf(name)) RESERVED_METHODS.push(name);
});

module.exports = Controller;
