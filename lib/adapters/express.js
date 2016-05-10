'use strict';

const express = require('express');
const assert = require('assert');
const debug = require('debug')('baiji:adapters:express');
const ExpressContext = require('../contexts/express');
const Adapter = require('../Adapter');
const utils = require('../utils');

module.exports = class ExpressAdapter extends Adapter {
  constructor(app, options) {
    super(app, options);

    this.routes = [];
  }

  createHandler() {
    let app = this.app;
    let methods = app.composedMethods();
    let router = express();

    let settings = this.app.settings;
    let setting;
    for(setting in settings) {
      router.set(setting, settings[setting]);
    }

    this.routes = [];

    function detectConflicts(routes, route) {
      routes.forEach((r) => {
        if (route.name === r.name) {
          utils.logError(`Conflict method '${r.name}' detected for app ${app.fullName()}`);
        }

        if (route.verb === r.verb && route.path === r.path) {
          utils.logError(`Conflict route path and verb detected for method '${r.name}' and method '${route.name}'`);
        }
      });
    }

    methods.forEach((method) => {
      let fn = method.stack;
      let path = method.fullPath();
      let name = method.fullName();

      let route = {
        verb: method.http.verb,
        path: path,
        name: name,
        description: method.description,
        notes: method.notes,
        handler: (req, res, next) => {
          let ctx = this.createContext(req, res, method, this.options);
          return fn(ctx, function (ctx) {
            if (ctx.error) return next(ctx.error);
            next();
          });
        }
      };

      detectConflicts(this.routes, route);

      this.routes.push(route);

      assert(router[route.verb], `Invalid http verb '${route.verb}' detected for method ${route.name}`);
      router[route.verb](route.path, route.handler);
    });

    // allow adapter reference from handler
    router.adapter = this;

    return router;
  }

  createContext(req, res, method, options) {
    let ctx = new ExpressContext(req, res, method, options);
    ctx.adapter = this;
    return ctx;
  }

  callback() {
    let router = this.createHandler();
    return (req, res, next) => {
      router(req, res, next);
    };
  }

  listen() {
    let router = this.createHandler();
    this.debugAllRoutes();
    router.listen.apply(router, arguments);
  }

  debugAllRoutes() {
    let types = ['name', 'verb', 'path', 'description'];
    let infos = {};

    function setMaxLength(type) {
      let lengthName = `${type}Length`;
      infos[lengthName] = 0;
      return function(str) {
        let length = (str || '').length;
        if (length > infos[lengthName]) infos[lengthName] = length;
      };
    }

    this.routes.forEach((route) => {
      types.forEach((type) => {
        if (!infos[type]) infos[type] = [];
        infos[type].push(route[type] || '');
      });
    });

    types.forEach((type) => infos[type].forEach(setMaxLength(type)));

    debug('All Routes:');
    let count = this.routes.length;
    let i = 0;
    while(i < count) {
      let sentence = types.map((type) => utils.padRight(infos[type][i], infos[`${type}Length`]));
      sentence.unshift('  ==> ');
      debug(sentence.join(' '));
      i++;
    }
  }
};
