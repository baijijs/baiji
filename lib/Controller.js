'use strict';

const assert = require('assert');
const _ = require('lodash');
const utils = require('./utils');

const Base = require('./Base');

const OVERWRITEABLE_PROPS = ['constructor'];
const RESERVED_PROPS = [];

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
      !~RESERVED_PROPS.indexOf(name),
      `Action: \`${name}\` is reserved by baiji.Controller, please rename it`
    );
  });
}

// Set configs
// Example: configure('index', { desc: 'list api', route: { path: '/', verb: 'get' } })
function configure(nameOrConfigs, actionConfig) {
  if (!this.__configs) this.__configs = {};
  if (typeof nameOrConfigs === 'string') {
    // Set new configs
    if (typeof actionConfig === 'object') {
      this.__configs = _.assign(
        this.__configs,
        { [nameOrConfigs]: actionConfig }
      );
    }

    // Get config
    else {
      return this.__configs[nameOrConfigs];
    }
  }

  // Overwrite all configs
  else if (typeof nameOrConfigs === 'object') {
    this.__configs = nameOrConfigs;
  }
}

// Extract default name and mount path from constructor name
function extractNameAndMountPath() {
  let name = this.constructor.name || '';
  name = _.snakeCase(name);
  name = name.replace(/_(ctrl|controller)$/, '');
  return name || utils.getName();
}

/**
 * Skip target hook according to options
 * @private
 */
function skipHook(type, name, skipOptions) {
  assert(typeof name === 'string', `Invalid action name '${name}'`);
  assert(typeof this[name] === 'function', `No action named '${name}' defined`);

  let hook = _.get(this.__hooksConfig, `${type}.${name}`);
  if (!hook) return this;

  // Parse options
  skipOptions = optionParser(skipOptions);

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
  *   setHook.call(this, 'before', 'signInRequired')
  *   setHook.call(this, 'before', 'signInRequired', { only: 'my-articles' })
  *   setHook.call(this, 'before', 'signInRequired', { only: ['my-articles'] })
  *   setHook.call(this, 'before', 'signInRequired', { except: 'sign-in' })
  *   setHook.call(this, 'before', 'signInRequired', { except: ['sign-in', 'sign-up'] })
  *
  * @param {string} type
  * @param {string|function} nameOrFn
  * @param {object} [options]
  * @param {string|array} [options.only]
  * @param {string|array} [options.except]
  * @return {this}
  * @private
  */
function setHook(type, nameOrFn, options) {
  let name;
  let fn;

  // Support `setHook('before', 'signInRequired', {})`
  if (typeof nameOrFn === 'string') {
    name = nameOrFn;
    fn = this[nameOrFn];
    assert(typeof fn === 'function', `No action named '${nameOrFn}' defined`);
  }

  // Support `setHook('before', function(ctx, next) {}, {})`
  else if (typeof nameOrFn === 'function') {
    name = utils.getName(nameOrFn);
    fn = nameOrFn;
  } else {
    assert(false, `Invalid ${type} ${nameOrFn}`);
  }

  // Parse options
  options = optionParser(
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

// Option parser
function optionParser(options, prevOpts) {
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

/**
 * General Controller class
 */
class Controller extends Base {
  constructor(injectedProps = {}) {
    super();

    this.name = this.mountPath = extractNameAndMountPath.call(this);

    // Combile hooksConfig from prototype.__hooksConfig
    this.__hooksConfig = _.assign({}, this.__hooksConfig);

    // Combine routes from prototype.__configs
    this.__configs = _.assign({}, this.__configs);

    // Check reserved instance actions
    detectConflictActions(this);

    // Inject props into `this`
    _.map(injectedProps, (key, val) => {
      this[key] = val;
    });

    // Init configs
    const initConfig = this.initConfig;
    if (typeof initConfig === 'function') {
      let config = initConfig.call(this);
      if (typeof config === 'object') {
        configure.call(this, config);
      }
    }
  }

  // Set before hook, see `setHook` action
  beforeAction(nameOrFn, options) {
    return setHook.call(this, 'before', nameOrFn, options);
  }

  // Set after hook, see `setHook` action
  afterAction(nameOrFn, options) {
    return setHook.call(this, 'after', nameOrFn, options);
  }

  onError(nameOrFn, options) {
    return setHook.call(this, 'onError', nameOrFn, options);
  }

  // Set beforeRespond hook, see `setHook` action
  beforeRespond(nameOrFn, options) {
    return setHook.call(this, 'beforeRespond', nameOrFn, options);
  }

  // Skip before hook
  skipBeforeAction(nameOrFn, options) {
    return skipHook.call(this, 'before', nameOrFn, options);
  }

  // Skip after hook
  skipAfterAction(nameOrFn, options) {
    return skipHook.call(this, 'after', nameOrFn, options);
  }

  // Skip error hook
  skipOnError(nameOrFn, options) {
    return skipHook.call(this, 'onError', nameOrFn, options);
  }

  // Skip before respond hook
  skipBeforeRespond(nameOrFn, options) {
    return skipHook.call(this, 'beforeRespond', nameOrFn, options);
  }
}

// Get Controller own property except for `constructor` and `initRoutes`
_.each([Controller, Base], klass => {
  _.each(Object.getOwnPropertyNames(klass.prototype), name => {
    if (!~OVERWRITEABLE_PROPS.indexOf(name) && !~RESERVED_PROPS.indexOf(name)) {
      RESERVED_PROPS.push(name);
    }
  });
});

module.exports = Controller;
