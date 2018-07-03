'use strict';

const assert = require('assert');
const _ = require('lodash');
const EventEmitter = require('events');
const utils = require('./utils');
const path = require('path');

const OVERWRITEABLE_METHODS = ['constructor'];
const RESERVED_METHODS = [];

// Route action for adding routes config for both Controller and its instance
function configure(proto, nameOrConfigs, actionConfig) {
  if (!proto.__configs) proto.__configs = {};
  if (typeof nameOrConfigs === 'string') {
    // Set new configs
    if (typeof actionConfig === 'object') {
      proto.__configs = _.assign(
        proto.__configs,
        { [nameOrConfigs]: actionConfig }
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
}

/**
 * Detect whether user defined actions unexpectedly overwritten reserved actions
 * Error will be throwed out if any confliction found
 */
function detectConflictActions(instance) {
  // Get all props and check reserved words
  let propNames = Object.getOwnPropertyNames(instance.__proto__);

  // Check internal action conflicts
  _.each(propNames, function(name) {
    assert(
      !~RESERVED_METHODS.indexOf(name),
      `Action: \`${name}\` is reserved by baiji.Controller, please rename it`
    );
  });
}

/**
 * General Controller class
 */
class Controller extends EventEmitter {

  // Static config action
  static configure(nameOrConfigs, actionConfig) {
    return configure(this.prototype, nameOrConfigs, actionConfig);
  }

  constructor(name, mountPath) {
    super();

    let defaultNameAndMountPath = this.__extractNameAndMountPath();

    // Parent reference
    this.parent = null;

    // Controller name
    this.name = name || defaultNameAndMountPath;

    // Controller description
    this.description = '';

    // Controller basePath
    this.basePath = '/';

    // Controller mountPath
    this.mountPath = mountPath || defaultNameAndMountPath || '/';

    // Combile hooksConfig from prototype.__hooksConfig
    this.__hooksConfig = _.assign({}, this.__hooksConfig);

    // Combine routes from prototype.__configs
    this.__configs = _.assign({}, this.__configs);

    // Check reserved instance actions
    detectConflictActions(this);

    // Init routes
    const initConfig = this.initConfig || this.initRoutes;
    if (typeof initConfig === 'function') {
      let config = initConfig.call(this);
      if (typeof config === 'object') {
        this.configure(config);
      }
    }
  }

  // Extract default name and mount path from constructor name
  __extractNameAndMountPath() {
    let name = this.constructor.name || '';
    name = _.snakeCase(name);
    name = name.replace(/_(ctrl|controller)$/, '');
    return name || utils.getName();
  }

  // Set controller name
  setName(name) {
    this.name = name;
    return this;
  }

  // Get controller name
  getName() {
    return this.name;
  }

  // Set controller base path
  setBasePath(path) {
    this.basePath = path;
    return this;
  }

  // Get controller base path
  getBasePath() {
    return this.basePath || '/';
  }

  // Set controller mountPath
  setMountPath(path) {
    this.mountPath = path;
    return this;
  }

  // Get controller mountPath
  getMountPath() {
    return path.posix.join(this.getBasePath(), this.mountPath || '/');
  }

  // Set configs
  // this.configure('index', { desc: 'list api', route: { path: '/', verb: 'get' } })
  configure(nameOrConfigs, actionConfig) {
    return configure(this, nameOrConfigs, actionConfig);
  }

  // Set before hook, see `__setHook` action
  beforeAction(nameOrFn, options) {
    return this.__setHook('before', nameOrFn, options);
  }

  // Set after hook, see `__setHook` action
  afterAction(nameOrFn, options) {
    return this.__setHook('after', nameOrFn, options);
  }

  // Set afterError hook, see `__setHook` action
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
    assert(typeof name === 'string', `Invalid action name '${name}'`);
    assert(typeof this[name] === 'function', `No action named '${name}' defined`);

    let hook = _.get(this.__hooksConfig, `${type}.${name}`);
    if (!hook) return this;

    // Parse options
    skipOptions = this.__optionParser(skipOptions);

    // Filter onlies according to skipOptions
    let onlies = [];
    let excepts = [];
    let prevOnlies = _.get(hook, 'options.only') || [];
    let prevExcepts = _.get(hook, 'options.except') || [];
    let skipExcepts = skipOptions.except;
    let skipOnlies = _.difference(skipOptions.only, skipExcepts);

    // skip { except: [], only: ['any'] }
    if (!skipExcepts.length) {
      // If contains '*' wildcard
      if (~skipOnlies.indexOf('*')) {
        excepts = ['*'];
        onlies = [];
      } else {
        onlies = _.difference(prevOnlies, skipOnlies);
        excepts = prevExcepts.concat(skipOnlies);
      }
    }

    // skip { except: ['any'], only: ['any'] }
    if (skipExcepts.length) {
      if (~skipExcepts.indexOf('*')) {
        onlies = ['*'];
        excepts = [];
      } else {
        if (~skipOnlies.indexOf('*')) {
          onlies = skipExcepts;
          excepts = [];
        } else {
          onlies = _.difference(prevOnlies.concat(skipExcepts), skipOnlies);
          excepts = prevExcepts.concat(skipOnlies);
        }
      }
    }

    // Overwrite hook config
    _.set(this.__hooksConfig, `${type}.${name}`, {
      fn: hook.fn,
      options: {
        only: _(onlies).uniq().compact().value(),
        except: _(excepts).uniq().compact().value()
      }
    });

    // Allow action chain
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
      assert(typeof fn === 'function', `No action named '${nameOrFn}' defined`);
    }

    // Support `__setHook('before', function(ctx, next) {}, {})`
    else if (typeof nameOrFn === 'function') {
      name = utils.getName(nameOrFn);
      fn = nameOrFn;
    } else {
      assert(false, `Invalid ${type} ${nameOrFn}`);
    }

    // Parse options
    options = this.__optionParser(
      options,
      _.get(this.__hooksConfig, `${type}.${name}.options`)
    );

    // Add hook config
    // Example: { fn: function(ctx, next) {}, options: { excepts: [], only: [] } }
    if (!this.__hooksConfig[type]) this.__hooksConfig[type] = {};
    this.__hooksConfig[type][name] = { fn, options };

    // Allow action chain
    return this;
  }

  __optionParser(options, prevOpts) {
    options = options || {};
    prevOpts = prevOpts || {};

    // Hook will apply to all actions by default
    let only = options.only || ['*'];
    let except = options.except || [];

    // Convert `options.only` and `options.except` to array
    if (!Array.isArray(only)) only = [only];
    if (!Array.isArray(except)) except = [except];

    // Merge same hooks' options
    only = _(only).concat(prevOpts.only).compact().uniq().value();
    except = _(except).concat(prevOpts.except).compact().uniq().value();

    // If `only` contains wildcard `*` then remove useless restrictions
    if (~only.indexOf('*')) only = ['*'];

    // If `except` contains wildcard `*` then remove useless restrictions
    if (~except.indexOf('*')) {
      except = ['*'];
      only = [];
    }

    return { only, except };
  }
}

// Get Controller own property except for `constructor` and `initRoutes`
_.each(Object.getOwnPropertyNames(Controller.prototype), function(name) {
  if (!~OVERWRITEABLE_METHODS.indexOf(name)) RESERVED_METHODS.push(name);
});

module.exports = Controller;
