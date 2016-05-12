'use strict';

const express = require('express');
const assert = require('assert');
const bodyParser = require('body-parser');
const cors = require('cors');
const debug = require('debug')('baiji:adapters:express');
const ExpressContext = require('../contexts/express');
const Adapter = require('../Adapter');
const utils = require('../utils');

const json = bodyParser.json;
const urlencoded = bodyParser.urlencoded;

module.exports = class ExpressAdapter extends Adapter {
  constructor(app, options) {
    super(app, options);

    this.routes = [];

    this.applyDefaultOptions();
  }

  applyDefaultOptions() {
    if (!this.options.urlencoded) this.options.urlencoded = { extended: true };
    if (this.options.urlencoded.extended === undefined) {
      this.options.urlencoded.extended = true;
    }

    // Set strict to be `false` so that anything `JSON.parse()` accepts will be parsed
    if (!this.options.json) this.options.json = { strict: false };

    if (!this.options.cors) this.options.cors = { origin: true, credentials: true };

    debug('ExpressAdapter options: %j', this.options);
  }

  createHandler() {
    let app = this.app;
    let options = this.options;
    let methods = app.composedMethods();
    let router = express();

    let settings = this.app.settings;
    let setting;
    for(setting in settings) {
      router.set(setting, settings[setting]);
    }

    // use x-powered-by middleware
    router.use(function(req, res, next) {
      if (app.enabled('x-powered-by')) res.setHeader('X-Powered-By', 'Baiji');
      next();
    });

    // Add a handler to tolerate empty json as connect's json middleware throws an error
    router.use(function(req, res, next) {
      if (req.is('application/json')) {
        if (req.get('Content-Length') === '0') {
          // This doesn't cover the transfer-encoding: chunked
          req._body = true; // Mark it as parsed
          req.body = {};
        }
      }
      next();
    });

    // Optimize the cors handler
    function corsHandler(req, res, next) {
      var reqUrl = req.protocol + '://' + req.get('host');
      if (req.method === 'OPTIONS' || reqUrl !== req.get('origin')) {
        cors(options.cors)(req, res, next);
      } else {
        next();
      }
    }

    // Set up CORS first so that it's always enabled even when parsing errors
    // happen in urlencoded/json
    if (options.cors) router.use(corsHandler);

    router.use(urlencoded(options.urlencoded));
    router.use(json(options.json));

    this.routes = [];

    // Generate all routes
    methods.forEach((method) => {
      let fn = method.stack;
      let path = method.fullPath();
      let name = method.fullName();
      let verb = method.http.verb;

      let route = {
        verb: verb,
        path: path,
        name: name,
        description: method.description,
        notes: method.notes,
        handler: (req, res, next) => {
          let ctx = this.createContext(req, res, method, this.options);
          return fn(ctx, function (ctx) {
            if (ctx.error) return next(ctx.error);
            // Allow express middleware go next
            if (verb === 'use') next();
          });
        }
      };

      this.routes.push(route);
    });

    // Sort all routes
    this.routes = this.routes.sort(utils.sortRoute);

    // Apply all routes
    this.routes.forEach(function(route) {
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
    this.debugAllRoutes();
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
      sentence.unshift('=>');
      debug(sentence.join(' '));
      i++;
    }
  }
};
