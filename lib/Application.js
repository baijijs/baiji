'use strict';

const EventEmitter = require('events');
const assert = require('assert');
const path = require('path');
const _ = require('lodash');
const Promise = require('any-promise');
const mm = require('micromatch');
const onFinished = require('on-finished');
const debug = require('debug')('baiji:Application');

const Controller = require('./Controller');
const Action = require('./Action');
const utils = require('./utils');

class Application extends EventEmitter {
  constructor(name, settings) {
    super();

    name = name || utils.getName();
    settings = settings || {};

    assert(typeof name === 'string', `${name} is not valid application name`);
    this.name = name;

    // Init hooks
    this.beforeHooks = Object.create(null);
    this.afterHooks  = Object.create(null);
    this.afterErrorHooks = Object.create(null);

    this.settings = _.assign({}, settings);

    this.actions = [];

    this.mountedApps = [];

    this.context = Object.create(null);

    // Apply default configuration
    this.defaultConfiguration();
  }

  defaultConfiguration() {
    let env = process.env.NODE_ENV || 'development';

    // Default settings
    this.set('env', env);
    this.set('adapter', 'express');
    this.enable('x-powered-by');

    // Setup locals
    this.locals = Object.create(null);

    // Top-most app is mounted at /
    this.mountPath = this.settings.mountPath || '/';

    // Default locals
    this.locals.settings = this.settings;
  }

  setName(name) {
    this.name = name;
    return this;
  }

  getName() {
    return this.name;
  }

  setMountPath(path) {
    this.mountPath = path;
    return this;
  }

  getMountPath() {
    return this.mountPath || '/';
  }

  define(actionOrName, options, fn) {
    let action;

    if (actionOrName instanceof Action) {
      action = actionOrName.clone();
    } else {
      action = new Action(actionOrName, options, utils.wrapperFn(fn));
    }

    action.parent = this;

    this.actions.push(action);

    return this;
  }

  // Provides a nice, tested, standardized way of adding plugins to a
  // `Baiji` instance, injecting the current instance into the plugin,
  // which should be a module.exports.
  plugin(plugin, options) {
    if (typeof plugin === 'string') {
      try {
        require(path.join(__dirname, 'plugins', plugin))(this, options);
      } catch (e) {
        if (e.code !== 'MODULE_NOT_FOUND') {
          throw e;
        } else {
          utils.logError(e);
        }
      }
    } else if (Array.isArray(plugin)) {
      _.each(plugin, p => this.plugin(p, options));
    } else if (typeof plugin === 'function') {
      plugin(this, options);
    } else {
      throw new Error(`Invalid plugin: ${plugin} with options ${options}`);
    }
    return this;
  }

  clone() {
    let app = new Application(this.getName());
    app.parent = this.parent;
    app.mountPath = this.mountPath;

    // Merge settings
    app.settings = _.cloneDeep(this.settings);

    // Merge context
    app.context = _.clone(this.context);

    // Merge hooks
    app.beforeHooks = _.clone(this.beforeHooks);
    app.afterHooks = _.clone(this.afterHooks);
    app.afterErrorHooks = _.clone(this.afterErrorHooks);

    // Merge locals
    app.locals = _.cloneDeep(this.locals);

    // Remount subapps
    _.each(this.mountedApps, mountedApp => app.use(mountedApp));

    // Redefine actions
    _.each(this.actions, action => app.define(action));

    // Clone all events
    utils.copyEvents(this, app);

    return app;
  }

  // support Controller, Application, Express middleware
  use(fn, options) {
    if (typeof fn === 'function') {
      // if fn extends Controller, initialize a new instance
      if (fn.prototype instanceof Controller) {
        return this._useController(new fn(), options);
      }
      // otherwise use as middleware function
      else {
        return this._useFunctionMiddleware(fn, options);
      }
    }

    if (fn instanceof Application) return this._useApplication(fn, options);
    if (fn instanceof Controller) return this._useController(fn, options);
    if (fn instanceof Action) return this._useAction(fn, options);

    assert(false, `${fn} is not a valid middleware or baiji app`);
  }

  _useFunctionMiddleware(fn, options) {
    assert(typeof fn === 'function', `${fn} is not a valid middleware function`);
    if (!options) options = { name: null, mountPath: '/' };
    options.route = options.http || options.route || { path: options.mountPath || '/', verb: 'use' };
    options.adapter = options.adapter || this.get('adapter');

    let name = options.name || utils.getName(fn);
    let action;

    switch (options.adapter) {
      case 'express':
        action = new Action(name, options, function(ctx, next) {
          return new Promise(function(resolve, reject) {
            let nextHandled = false;

            // Execute main function middleware
            fn(ctx.req, ctx.res, handleNext);

            // Handle after hooks when response finished
            onFinished(ctx.res, handleNext);

            function handleNext(err) {
              if (nextHandled) return;
              // Mark as handled
              nextHandled = true;

              // Handle error
              if (err) return reject(err);

              // Go next
              resolve(next());
            }
          });
        });
        break;
      case 'socketio':
        action = new Action(name, options, function(ctx, next) {
          return new Promise(function(resolve, reject) {
            // Call middleware and let baiji handle error
            fn(ctx.socket, function(err) {
              if (err) return reject(err);
              resolve(next());
            });
          });
        });
        break;
      default:
        action = new Action(name, options, fn);
        break;
    }

    return this.define(action);
  }

  // Use Application instance
  _useApplication(app, options) {
    assert(app instanceof Application, `${app} is not a valid Application instance`);
    if (!options) options = {};
    app = app.clone();
    app.parent = this;
    app.mountPath = options.mountPath || app.mountPath || '/';

    // Merge settings
    let adapterOptions = app.get('adapterOptions');
    app.settings = _.assign(app.settings, this.settings);
    app.settings.adapterOptions = _.assign(adapterOptions, this.get('adapterOptions'));

    // Mount app
    this.mountedApps.push(app);

    // Emit `mount` event
    utils.emitSync.call(app, 'mount', this);

    return this;
  }

  // Transfer Controller instance into an Application instance
  _useController(ctrl, options) {
    assert(ctrl instanceof Controller, `${ctrl} is not a valid Controller instance`);
    if (!options) options = {};

    // Get name
    let name = options.name || ctrl.name || utils.getName();

    // Initialize a new app instance
    let app = new Application(name, _.clone(this.settings));
    app.locals = _.cloneDeep(app.locals);

    // Set description
    if (ctrl.description) app.set('description', ctrl.description);

    // Set `parent` reference and `mountPath`
    app.parent = this;
    app.mountPath = options.mountPath || ctrl.getMountPath() || '/';

    // Set initCtrl beforeHook for clean invoking context of hook and action
    app.before('*', async function initController(ctx, next) {
      // non-configurable `__ctrl__`
      Object.defineProperty(ctx, '__ctrl__', {
        configurable: false,
        value: Object.create(ctrl)
      });

      await next();
    });

    // Get all action names in ctrl
    let actionNames = Object.keys(ctrl.__configs);

    // Loop through ctrl.__configs and add actions
    _.each(ctrl.__configs, function(actionConfig, actionName) {
      assert(
        typeof ctrl[actionName] === 'function',
        `No action named '${actionName}' defined for Controller '${name}'`
      );

      let actionFn = utils.wrapperFn(ctrl[actionName]);

      // Define actions by action name and config one by one
      app.define(actionName, actionConfig, function(ctx, next) {
        // Keep `ctrl` as action context
        return actionFn.call(ctx.__ctrl__, ctx, next);
      });
    });

    // Loop through ctrl.__hooksConfig and add hook for app
    _.each(ctrl.__hooksConfig, function(hooks, hookType) {
      _.each(hooks, function(hookConfig) {
        let onlies = hookConfig.options.only;
        let excepts = hookConfig.options.except;

        let hookedActionNames = [];

        // add hook for allowed actions
        _.each(actionNames, function(actionName) {
          // except has higher priority
          if (~excepts.indexOf('*') || ~excepts.indexOf(actionName)) return;
          if (~onlies.indexOf('*') || ~onlies.indexOf(actionName)) {
            hookedActionNames.push(actionName);
          }
        });

        // Construct a named function with ctrl as invoke context
        let hookFn = (new Function('hook', `
          return function ${hookConfig.fn.name || ''}(ctx, next) {
            return hook.call(ctx.__ctrl__, ctx, next);
          }`
        ))(hookConfig.fn);

        // Apply hooks
        if (hookedActionNames.length) app[hookType](hookedActionNames, hookFn);
      });
    });

    // Mount app
    this.mountedApps.push(app);

    // Emit `mount` event
    utils.emitSync.call(ctrl, 'mount', this);

    return this;
  }

  _useAction(action, options) {
    assert(action instanceof Action, `${action} is not a valid Action instance`);
    action = action.clone();
    let segments = ['/'];
    if (options.mountPath) segments.push(options.mountPath);
    if (action.route.path) segments.push(action.route.path);
    action.route.path = path.posix.join.apply(path, segments);

    return this.define(action);
  }

  searchHooksByType(type) {
    assert(
      typeof type === 'string' && ~utils.hookTypes.indexOf(type),
      `${type} is not a valid type`
    );

    let typeName = `${type}Hooks`;

    let hooks = utils.addPrefix(this[typeName], this.name);

    _.each(this.mountedApps, (app) => {
      hooks = _.assign(hooks, utils.addPrefix(app.searchHooksByType(type), this.name));
    });

    return hooks;
  }

  // Get all actions
  allActions() {
    let actions = [].concat(this.actions);
    _.each(this.mountedApps, function(app) {
      actions = actions.concat(app.allActions());
    });
    return actions;
  }

  // Get all composed actions
  composedActions() {
    let beforeHooks = this.searchHooksByType('before');
    let afterHooks = this.searchHooksByType('after');
    let afterErrorHooks = this.searchHooksByType('afterError');

    return _.map(this.allActions(), function(action) {
      let name = action.fullName();

      action.compose(
        utils.filterHooks(beforeHooks, name),
        utils.filterHooks(afterHooks, name),
        utils.filterHooks(afterErrorHooks, name)
      );

      return action;
    });
  }

  // Search all actions by pattern and then parse with specific parser
  searchAllActionsByName(pattern, parser) {
    let patternType = typeof pattern;

    assert(
      ['string', 'function'].indexOf(patternType) !== -1,
      '`pattern` must be a globbing pattern or a filter function'
    );

    let isMatch = patternType === 'function' ? pattern : function(m) {
      return mm.isMatch(m.fullName(), pattern);
    };

    let parse = typeof parser === 'function' ? parser : function(m) { return m; };

    let selectedActions = [];

    _.each(this.allActions(), function(action) {
      if (isMatch(action)) selectedActions.push(parse(action));
    });

    return selectedActions;
  }

  callback() {
    let adapter = this.adapter();
    return adapter.callback();
  }

  listen() {
    let adapter = this.adapter();
    return adapter.listen.apply(adapter, arguments);
  }

  adapter(name, options) {
    name = name || this.get('adapter');
    options = options || {};
    let Adapter;
    try {
      Adapter = require(path.join(__dirname, 'adapters', name));
    } catch (e) {
      if (e.code === 'MODULE_NOT_FOUND') assert(false, `Adapter for '${name}' not found!`);
      throw e;
    }

    // Initialize Adapter instance with baiji instance
    let adapter = new Adapter(this, options);

    return adapter;
  }

  set(setting, val) {
    if (arguments.length === 1) {
      return _.get(this.settings, setting);
    }

    debug('%s: set "%s" to %o', this.fullName(), setting, val);

    // Set value by setting
    _.set(this.settings, setting, val);

    return this;
  }

  enabled(setting) {
    return Boolean(this.set(setting));
  }

  disabled(setting) {
    return !this.set(setting);
  }

  enable(setting) {
    return this.set(setting, true);
  }

  disable(setting) {
    return this.set(setting, false);
  }

  fullName() {
    return this.parent && typeof this.parent.fullName === 'function' ?
      `${this.parent.fullName()}.${this.name}` :
      this.name;
  }

  fullPath() {
    let mountPath = this.mountPath || '/';
    return this.parent && typeof this.parent.fullPath === 'function' ?
      path.posix.join(this.parent.fullPath(), mountPath) :
      mountPath;
  }
}

// Add hooks
utils.addHookMethods(Application.prototype);

// Add http quick methods
utils.addHttpMethods(Application.prototype);

module.exports = Application;
