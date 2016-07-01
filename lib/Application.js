'use strict';

const EventEmitter = require('events');
const assert = require('assert');
const path = require('path');
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

    this.beforeHooks = {};
    this.afterHooks  = {};
    this.afterErrorHooks = {};

    this.settings = Object.assign({}, settings);

    this.methods = [];

    this.mountedApps = [];

    this.defaultConfiguration();
  }

  defaultConfiguration() {
    let env = process.env.NODE_ENV || 'development';

    // default settings
    this.set('env', env);
    this.set('adapter', 'express');
    this.enable('x-powered-by');

    // setup locals
    this.locals = Object.create(null);

    // top-most app is mounted at /
    this.mountpath = this.settings.mountpath || '/';

    // default locals
    this.locals.settings = this.settings;
  }

  setName(name) {
    this.name = name;
    return this;
  }

  getName() {
    return this.name;
  }

  define(method) {
    if (method instanceof Method) {
      method = method.clone();
    } else {
      method = Method.create.apply(Method, arguments);
    }

    method.parent = this;
    this.methods.push(method);
    return this;
  }

  // function that will be apply to application instance before start
  plugin(fn, options) {
    assert(typeof fn === 'function', `${fn} must be a function`);
    options = options || {};
    fn(this, options);
    return this;
  }

  clone() {
    let app = new Application(this.getName());
    app.parent = this.parent;
    app.mountpath = this.mountpath;

    // merge settings and hooks
    app.settings = Object.assign({}, this.settings);
    app.beforeHooks = Object.assign({}, this.beforeHooks);
    app.afterHooks = Object.assign({}, this.afterHooks);
    app.afterErrorHooks = Object.assign({}, this.afterErrorHooks);

    // remount subapps
    this.mountedApps.map((mountedApp => app.use(mountedApp)));

    // redefine methods
    this.methods.map((method) => app.define(method));

    return app;
  }

  // support Controller, Application, Express
  use(fn, options) {
    assert(
      fn && (
        typeof fn === 'function' ||
        fn instanceof Application
      ),
      `${fn} is not a valid middleware or baiji app`
    );

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

    return this;
  }

  _useFunctionMiddleware(fn, options) {
    assert(typeof fn === 'function', `${fn} is not a valid middleware function`);
    if (!options) options = { name: null, mountpath: '/' };
    options.http = options.http || { path: options.mountpath || '/', verb: 'use' };
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
              if (err) return reject(err);
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

  _useApplication(app, options) {
    assert(app instanceof Application, `${app} is not a valid Application instance`);
    if (!options) options = {};
    app = app.clone();
    app.parent = this;
    app.mountpath = options.mountpath || app.mountpath || '/';
    app.settings = Object.assign(app.settings, this.settings);

    this.mountedApps.push(app);

    return this;
  }

  // Transfer Controller instance into an Application instance
  _useController(ctrl, options) {
    assert(ctrl instanceof Controller, `${ctrl} is not a valid Controller instance`);
    if (!options) options = {};
    let name = options.name || ctrl.name || utils.getName();
    let app = new Application(name, Object.assign({}, this.settings));
    app.parent = this;
    app.mountpath = options.mountpath || ctrl.mountpath || '/';

    let methodNames = Object.keys(ctrl.__routes);

    // Loop through ctrl.__routes and add methods
    for (let methodName in ctrl.__routes) {
      let methodConfig = ctrl.route(methodName);
      assert(typeof ctrl[methodName] === 'function', `No method named '${methodName}' defined for Controller '${name}'`);
      app.define(methodName, methodConfig, function(ctx, next) {
        return ctrl[methodName](ctx, next);
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

        // apply hook
        if (hookedNames.length) app[hookType](hookedNames, hookConfig.fn);
      }
    });

    // Mount app
    this.mountedApps.push(app);

    return this;
  }

  searchHooksByType(type) {
    assert(typeof type === 'string' && utils.hookTypes.indexOf(type) > -1, `${type} is not a valid type`);

    let typeName = `${type}Hooks`;

    let hooks = utils.addPrefix(this[typeName], this.name);

    this.mountedApps.forEach((app) => {
      hooks = Object.assign(hooks, utils.addPrefix(app.searchHooksByType(type), this.name));
    });

    return hooks;
  }

  allMethods() {
    let methods = [].concat(this.methods);
    this.mountedApps.forEach(function(app) {
      methods = methods.concat(app.allMethods());
    });
    return methods;
  }

  composedMethods() {
    let beforeHooks = this.searchHooksByType('before');
    let afterHooks = this.searchHooksByType('after');
    let afterErrorHooks = this.searchHooksByType('afterError');

    return this.allMethods()
               .map((method) => {
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
    name = this.get('adapter');
    options = options || Object.create(this.settings);
    let Adapter;
    try {
      Adapter = require(path.join(__dirname, 'adapters', name));
    } catch (e) {
      if (e.code === 'MODULE_NOT_FOUND') assert(false, `Adapter for '${name}' not found!`);
      throw e;
    }

    let adapter = new Adapter(this, options);

    return adapter;
  }

  get(setting) {
    return this.set(setting);
  }

  set(setting, val) {
    if (arguments.length === 1) {
      // app.get(setting)
      return this.settings[setting];
    }

    debug('%s: set "%s" to %o', this.fullName(), setting, val);

    // set value
    this.settings[setting] = val;

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
    let mountpath = this.mountpath || '/';
    return this.parent ? path.join(this.parent.fullPath(), mountpath) : mountpath;
  }
}

// Add hooks
utils.addHookMethods(Application.prototype);

module.exports = Application;
