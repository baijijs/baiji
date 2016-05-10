'use strict';

const EventEmitter = require('events');
const assert = require('assert');
const path = require('path');
const Promise = require('any-promise');
const debug = require('debug')('baiji:Application');

const Method = require('./Method');
const utils = require('./utils');

class Application extends EventEmitter {
  constructor(name) {
    super();
    name = name || utils.getName();

    assert(typeof name === 'string', `${name} is not valid name`);
    this.name = name;

    this.beforeActions = {};
    this.afterActions  = {};
    this.afterErrorActions = {};

    this.settings = {};

    this.methods = [];

    this.mountedApps = [];

    this.defaultConfiguration();
  }

  defaultConfiguration() {
    let env = process.env.NODE_ENV || 'development';

    // default settings
    this.set('env', env);
    this.set('adapter', 'express');

    // setup locals
    this.locals = Object.create(null);

    // top-most app is mounted at /
    this.mountpath = '/';

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
    app.settings = Object.assign({}, this.settings);
    app.beforeActions = Object.assign({}, this.beforeActions);
    app.afterActions = Object.assign({}, this.afterActions);
    app.afterErrorActions = Object.assign({}, this.afterErrorActions);

    this.methods.map((method) => app.define(method));

    return app;
  }

  // support Controller, Application, Express, Koa
  // let midware = function(req, res) {}
  //       =>
  //          Method('anonymous', {}, function(ctx, next) { return midware.call(this, ctx.request, ctx.response); // TODO handle next  })
  use(fn, options) {
    assert(
      fn && (
        typeof fn === 'function' ||
        fn instanceof Application
      ),
      `${fn} is not a valid middleware or baiji app`
    );

    if (typeof fn === 'function') return this._useFunctionMiddleware(fn, options);
    if (fn instanceof Application) return this._useApplication(fn, options);
  }

  _useFunctionMiddleware(fn, options) {
    assert(typeof fn === 'function', `${fn} is not a valid middleware function`);
    if (!options) options = { name: null, mountpath: '/' };
    options.http = options.http || { path: options.mountpath || '/', verb: 'use' };

    let name = options.name || utils.getName(fn);

    let method = new Method(name, options, function(ctx, next) {
      return new Promise(function(resolve, reject) {
        fn(ctx.request, ctx.response, function(err) {
          if (err) return reject(err);
          resolve(next());
        });
      });
    });

    return this.define(method);
  }

  _useApplication(app, options) {
    assert(app instanceof Application, `${app} is not a valid Application instance`);
    if (!options) options = {};
    app = app.clone();
    app.parent = this;
    app.mountpath = options.mountpath || '/';
    app.settings = Object.assign(app.settings, this.settings);

    this.mountedApps.push(app);

    return this;
  }

  searchHooksByType(type) {
    assert(typeof type === 'string' && utils.hookTypes.indexOf(type) > -1, `${type} is not a valid type`);

    let typeName = `${type}Actions`;

    let hooks = utils.addPrefix(this[typeName], this.name);

    this.mountedApps.forEach((app) => {
      hooks = Object.assign(hooks, utils.addPrefix(app.searchHooksByType(type), this.name));
    });

    return hooks;
  }

  allMethods() {
    let methods = [];
    this.mountedApps.forEach(function(app) {
      methods = methods.concat(app.allMethods());
    });
    methods = methods.concat(this.methods);
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

    debug('set "%s" to %o', setting, val);

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
