'use strict';

const assert = require('assert');
const path = require('path');
const _ = require('lodash');
const mm = require('micromatch');
const onFinished = require('on-finished');
const debug = require('debug')('baiji:Application');

const Base = require('./Base');
const Controller = require('./Controller');
const Action = require('./Action');
const Hook = require('./Hook');
const utils = require('./utils');

class Application extends Base {
  constructor(name, settings) {
    super();

    name = name || utils.getName();
    settings = settings || {};

    assert(typeof name === 'string', `${name} is not valid application name`);
    this.name = name;

    this.settings = _.assign({}, settings);

    // Actions
    this.actions = [];

    // Mounted apps
    this.mountedApps = [];

    // Lazy mount controllers
    this.pendingCtrls = [];

    // Init hooks
    this.hooks = new Hook({
      host: this,
      nestedHosts: 'mountedApps'
    });

    this.context = Object.create(null);

    // Apply default configuration
    this.applyDefaults();

    // Add http quick methods
    utils.installHttpMethods(this);
  }

  applyDefaults() {
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

  define() {
    let action = Action.create.apply(Action, arguments);
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
    let app = new Application(this.name);

    app.mountPath = this.mountPath;
    app.parent = this.parent;

    // Merge settings
    app.settings = _.cloneDeep(this.settings);

    // Merge context
    app.context = _.clone(this.context);

    // Clone hooks
    app.hooks = this.hooks.clone(app);

    // Merge locals
    app.locals = _.cloneDeep(this.locals);

    // Remount subapps
    _.each(this.mountedApps, mountedApp => app.use(mountedApp));

    // Clone pendingCtrls
    app.pendingCtrls = this.pendingCtrls.slice();

    // Redefine actions
    _.each(this.actions, action => app.define(action));

    // Clone all events
    utils.copyEvents(this, app);

    return app;
  }

  // support Controller, Application, Express middleware
  use(fn, options = {}) {
    if (typeof fn === 'function') {
      // if fn extends Controller, use it later
      if (fn.prototype instanceof Controller) {
        this.pendingCtrls.push({ fn, options });
        return this;
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
    options.route = options.route || { path: options.mountPath || '/', verb: 'use' };
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
  _useApplication(app, options = {}) {
    assert(app instanceof Application, `${app} is not a valid Application instance`);

    app = app.clone();
    app.parent = this;
    app.mountPath = options.mountPath || app.mountPath || '/';

    // Merge settings
    app.settings = _.assign(app.settings, this.settings);
    app.settings.adapterOptions = _.assign(
      app.get('adapterOptions'),
      this.get('adapterOptions')
    );

    // Merge context
    app.context = _.assign(app.context, this.context);

    // Mount app
    this.mountedApps.push(app);

    // Emit `mount` event
    utils.emitSync.call(app, 'mount', this);

    return this;
  }

  // Transfer Controller instance into an Application instance
  _useController(ctrl, options = {}) {
    assert(ctrl instanceof Controller, `${ctrl} is not a valid Controller instance`);

    // Get name
    let name = options.name || ctrl.name || utils.getName();

    // Initialize a new app instance
    let app = new Application(name, _.clone(this.settings));
    app.locals = _.cloneDeep(app.locals);
    app.description = ctrl.description;
    app.parent = this;
    app.mountPath = options.mountPath || ctrl.mountPath || '/';

    app = utils.convertControllerToApp(ctrl, app);

    // Mount app
    this.mountedApps.push(app);

    // Emit `mount` event
    utils.emitSync.call(ctrl, 'mount', this);

    return this;
  }

  _useAction(action, options) {
    assert(action instanceof Action, `${action} is not a valid Action instance`);
    action = action.clone();
    if (options.mountPath) action.mountPath = options.mountPath;
    return this.define(action);
  }

  // Get all actions
  allActions() {
    let actions = [].concat(this.actions);
    _.each(this.mountedApps, app => {
      actions = actions.concat(app.allActions());
    });
    return actions;
  }

  // Get all composed actions
  composedActions(wrapper) {
    let hasWrapper = _.isFunction(wrapper);

    return _.map(this.allActions(), action => {
      let name = action.fullName;

      action.compose(this.hooks.filter(name));

      return hasWrapper ? wrapper(action) : action;
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
      return mm.isMatch(m.fullName, pattern);
    };

    let parse = typeof parser === 'function' ? parser : function(m) { return m; };

    let selectedActions = [];

    _.each(this.allActions(), function(action) {
      if (isMatch(action)) selectedActions.push(parse(action));
    });

    return selectedActions;
  }

  callback() {
    return this.adapter().callback();
  }

  listen() {
    let adapter = this.adapter();
    return adapter.listen.apply(adapter, arguments);
  }

  // Mount all pending controllers
  mountPendingCtrls() {
    let item = this.pendingCtrls.shift();
    if (item) {
      const ctrl = new item.fn(this.context);
      this._useController(ctrl, item.options);

      // mount ctrl one by one
      this.mountPendingCtrls();
    } else {
      // check mounted apps
      _.each(this.mountedApps, app => app.mountPendingCtrls());
    }
  }

  adapter(name, options) {
    name = name || this.get('adapter');
    options = options || {};
    let Adapter;
    try {
      Adapter = require(path.join(__dirname, 'adapters', name));
    } catch (e) {
      if (e.code === 'MODULE_NOT_FOUND') {
        assert(false, `Adapter for '${name}' not found!`);
      }
      throw e;
    }

    // Mount all pending controllers
    this.mountPendingCtrls();

    // Initialize Adapter instance with baiji instance
    let adapter = new Adapter(this, options);

    return adapter;
  }

  set(key, val) {
    if (arguments.length === 1) return _.get(this.settings, key);

    debug('%s: set "%s" to %o', this.fullName, key, val);

    // Set value by key
    _.set(this.settings, key, val);
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
}

module.exports = Application;
