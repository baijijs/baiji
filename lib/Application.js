'use strict';

const EventEmitter = require('events');
const assert = require('assert');
const path = require('path');
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
      this.methods.push(method);
    } else {
      this.methods.push(Method.create.apply(Method, arguments));
    }
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
    app.methods = this.methods.slice();

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
      `${fn} is not a valid middleware`
    );

    if (typeof fn === 'function') return this._useFunctionMiddleware(fn, options);
    if (fn instanceof Application) return this._useApplication(fn, options);
  }

  _useFunctionMiddleware(fn, options) {
    assert(typeof fn === 'function', `${fn} is not a valid middleware function`);
    options = options || { name: null, http: { path: '/', verb: 'all' } };

    let name = options.name || utils.getName(fn);

    let method = new Method(name, options, function(ctx, next) {
      return fn(ctx.request, ctx.response, next);
    });

    method.parent = this;

    this._composeMethodStack(method);

    return this;
  }

  _useApplication(app) {
    assert(app instanceof Application, `${app} is not a valid Application instance`);

    app = app.clone();
    app.parent = this;

    utils.mergeHooks(this, app);

    let setting;
    for (setting in this.settings) {
      app.set(setting, this.settings[setting]);
    }

    app.methods.forEach( (method) => {
      this._composeMethodStack(method);
    });

    return this;
  }

  _composeMethodStack(method) {
    assert(method instanceof Method, `${method} is not a valid Method instance`);

    let fullName = method.fullName();
    let beforeHooks = utils.filterHooks(this.name, this.beforeHooks, fullName);
    let afterHooks = utils.filterHooks(this.name, this.afterHooks, fullName);
    let afterErrorHooks = utils.filterHooks(this.name, this.afterErrorHooks, fullName);

    method.compose(beforeHooks, afterHooks, afterErrorHooks);

    this.methods.push(method);

    return this;
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
    return this.parent ? path.join(this.parent.fullPath(), this.mountpath || '/') : this.mountpath;
  }
}

// Add hooks
utils.addHookMethods(Application.prototype);

module.exports = Application;
