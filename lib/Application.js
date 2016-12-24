'use strict';

const EventEmitter = require('events');
const assert = require('assert');
const path = require('path');
const magico = require('magico');
const Promise = require('any-promise');
const onFinished = require('on-finished');
const debug = require('debug')('baiji:Application');

const Controller = require('./Controller');
const Method = require('./Method');
const utils = require('./utils');

class Application extends EventEmitter {
  constructor(name, settings) {
    super();
    name = name || utils.getName();
    settings = settings || {};

    assert(typeof name === 'string', `${name} is not valid name`);
    this.name = name;

    // Init hooks
    this.beforeHooks = Object.create(null);
    this.afterHooks  = Object.create(null);
    this.afterErrorHooks = Object.create(null);

    this.settings = Object.assign({}, settings);

    this.methods = [];

    this.mountedApps = [];

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

  define(method) {
    if (method instanceof Method) {
      method = method.clone();
    } else {
      method = Method.create.apply(null, arguments);
    }

    method.parent = this;
    this.methods.push(method);
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
      plugin.forEach(p => this.plugin(p, options));
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
    app.settings = Object.assign({}, this.settings);
    app.settings.adapterOptions = Object.assign({}, this.get('adapterOptions') || {});

    // Merge hooks
    app.beforeHooks = Object.assign({}, this.beforeHooks);
    app.afterHooks = Object.assign({}, this.afterHooks);
    app.afterErrorHooks = Object.assign({}, this.afterErrorHooks);

    // Merge locals
    app.locals = Object.assign({}, this.locals);
    app.locals.settings = app.settings;

    // Remount subapps
    this.mountedApps.map((mountedApp => app.use(mountedApp)));

    // Redefine methods
    this.methods.map((method) => app.define(method));

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
    if (fn instanceof Method) return this._useMethod(fn, options);

    assert(false, `${fn} is not a valid middleware or baiji app`);
  }

  _useFunctionMiddleware(fn, options) {
    assert(typeof fn === 'function', `${fn} is not a valid middleware function`);
    if (!options) options = { name: null, mountPath: '/' };
    options.route = options.http || options.route || { path: options.mountPath || '/', verb: 'use' };
    options.adapter = options.adapter || this.get('adapter');

    let name = options.name || utils.getName(fn);
    let method;

    switch (options.adapter) {
      case 'express':
        method = new Method(name, options, function(ctx, next) {
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
        method = new Method(name, options, function(ctx, next) {
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
        method = new Method(name, options, fn);
        break;
    }

    return this.define(method);
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
    app.settings = Object.assign(app.settings, this.settings);
    app.settings.adapterOptions = Object.assign(adapterOptions, this.get('adapterOptions'));

    this.mountedApps.push(app);

    return this;
  }

  // Transfer Controller instance into an Application instance
  _useController(ctrl, options) {
    assert(ctrl instanceof Controller, `${ctrl} is not a valid Controller instance`);
    if (!options) options = {};

    // Get name
    let name = options.name || ctrl.name || utils.getName();

    // Initialize a new app instance
    let app = new Application(name, Object.assign({}, this.settings));

    // Set `parent` reference and `mountPath`
    app.parent = this;
    app.mountPath = options.mountPath || ctrl.getMountPath() || '/';

    // Set initCtrl beforeHook
    app.before('*', function initController(ctx, next) {
      ctx.__ctrl__ = Object.create(ctrl);
      next();
    });

    // Get all method names in ctrl
    let methodNames = Object.keys(ctrl.__configs);

    // Loop through ctrl.__configs and add methods
    for (let methodName in ctrl.__configs) {
      let methodConfig = ctrl.configure(methodName);
      assert(typeof ctrl[methodName] === 'function', `No method named '${methodName}' defined for Controller '${name}'`);
      app.define(methodName, methodConfig, function(ctx, next) {
        // Keep `ctrl` as method context
        return ctrl[methodName].call(ctx.__ctrl__, ctx, next);
      });
    }

    // Loop through ctrl.__hooksConfig and add hook for app
    utils.hookTypes.forEach(function(hookType) {
      let hooks = ctrl.__hooksConfig[hookType] || {};
      for (let hookName in hooks) {
        let hookConfig = hooks[hookName];

        let onlies = hookConfig.options.only;
        let excepts = hookConfig.options.except;

        let hookedNames = [];

        // add hook for allowed methods
        methodNames.forEach(function(methodName) {
          // except has higher priority
          if (~excepts.indexOf('*') || ~excepts.indexOf(methodName)) return;
          if (~onlies.indexOf('*') || ~onlies.indexOf(methodName)) {
            hookedNames.push(methodName);
          }
        });

        // Construct a named function with ctrl as invoke context
        let hookFn = (new Function('hook', `
          return function ${hookConfig.fn.name || ''}(ctx, next) {
            return hook.call(ctx.__ctrl__, ctx, next);
          }`
        ))(hookConfig.fn);

        // Apply hooks
        if (hookedNames.length) app[hookType](hookedNames, hookFn);
      }
    });

    // Mount app
    this.mountedApps.push(app);

    return this;
  }

  _useMethod(method, options) {
    assert(method instanceof Method, `${method} is not a valid Method instance`);
    method = method.clone();
    let segments = ['/'];
    if (options.mountPath) segments.push(options.mountPath);
    if (method.route.path) segments.push(method.route.path);
    method.route.path = path.join.apply(path, segments);

    return this.define(method);
  }

  searchHooksByType(type) {
    assert(typeof type === 'string' && ~utils.hookTypes.indexOf(type), `${type} is not a valid type`);

    let typeName = `${type}Hooks`;

    let hooks = utils.addPrefix(this[typeName], this.name);

    this.mountedApps.forEach((app) => {
      hooks = Object.assign(hooks, utils.addPrefix(app.searchHooksByType(type), this.name));
    });

    return hooks;
  }

  // Get all methods
  allMethods() {
    let methods = [].concat(this.methods);
    this.mountedApps.forEach(function(app) {
      methods = methods.concat(app.allMethods());
    });
    return methods;
  }

  // Get all composed methods
  composedMethods() {
    let beforeHooks = this.searchHooksByType('before');
    let afterHooks = this.searchHooksByType('after');
    let afterErrorHooks = this.searchHooksByType('afterError');

    return this.allMethods().map((method) => {
      let name = method.fullName();

      method.compose(
        utils.filterHooks(beforeHooks, name),
        utils.filterHooks(afterHooks, name),
        utils.filterHooks(afterErrorHooks, name)
      );

      return method;
    });
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
      // app.get(setting)
      return magico.get(this.settings, setting);
    }

    debug('%s: set "%s" to %o', this.fullName(), setting, val);

    // Set value by setting
    magico.set(this.settings, setting, val);

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
    return this.parent ? `${this.parent.fullName()}.${this.name}` : this.name;
  }

  fullPath() {
    let mountPath = this.mountPath || '/';
    return this.parent ? path.join(this.parent.fullPath(), mountPath) : mountPath;
  }
}

// Add hooks
utils.addHookMethods(Application.prototype);

// Add http quick methods
utils.addHttpMethods(Application.prototype);

module.exports = Application;
