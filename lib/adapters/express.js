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
    let methods = this.app.composedMethods();
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
          console.error(`Conflict method '${r.name}' detected for app ${app.fullName()}`);
        }

        if (route.verb === r.verb && route.path === r.path) {
          console.error(`Conflict route path and verb detected for method '${r.name}' and method '${route.name}'`);
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
          fn(ctx).then(() => next()).catch(next);
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
    let infos = [];
    let maxLength = 0;

    function setMaxLength(info) {
      let length = (info || '').length;
      if (length > maxLength) maxLength = length;
    }

    infos.push('All routes:');
    this.routes.forEach(function(route) {
      let str = route.name;
      str = [utils.padRight(str, 25), route.verb.toUpperCase()].join(' ');
      str = [utils.padRight(str, 36), route.path].join(' ');
      infos.push(`  ${route.description || route.notes || ''}:`);
      infos.push(`  ==>  ${str}`);
    });

    infos.forEach(setMaxLength);
    let padRight = maxLength + 4;
    infos.forEach(function(sentence) {
      debug(utils.padRight(sentence, padRight));
    });
  }
};
