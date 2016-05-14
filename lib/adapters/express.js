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

    this.Context = ExpressContext;

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

    // Generate all methods and sort
    this.methods = this.createMethods((method) => {
      let fn = method.stack;
      let skipHooks = method.skipHooks;
      let verb = method.http.verb;

      return (req, res, next) => {
        let ctx = this.createContext(req, res, method, this.options);
        return fn(ctx, function (ctx) {
          if (ctx.error) return next(ctx.error);
          // Allow express middleware go next by checking verb and skipHooks both meeting condition
          if (verb === 'use' && skipHooks && typeof next === 'function') next();
        });
      };
    }).sort(utils.sortRoute);

    // Apply all methods
    this.methods.forEach(function(route) {
      assert(router[route.verb], `Invalid http verb '${route.verb}' detected for method ${route.name}`);
      router[route.verb](route.path, route.handler);
    });

    // allow adapter reference from handler
    router.baijiAdapter = this;

    return router;
  }
};
