'use strict';

const express = require('express');
const assert = require('assert');
const bodyParser = require('body-parser');
const multer = require('multer');
const cors = require('cors');
const _ = require('lodash');
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
    // Set default urlencoded to `true`
    if (!this.options.urlencoded) this.options.urlencoded = { extended: true };
    if (this.options.urlencoded.extended === undefined) {
      this.options.urlencoded.extended = true;
    }

    // Set strict to be `false` so that anything `JSON.parse()` accepts will be parsed
    if (!this.options.json) this.options.json = { strict: false };

    // Basic cors options
    if (!this.options.cors) this.options.cors = { origin: true, credentials: true };

    debug('ExpressAdapter options: %j', this.options);
  }

  createHandler() {
    let app = this.app;
    let options = this.options;
    let router = express();

    // Copy settings
    _.each(this.app.settings, function(value, key) {
      router.set(key, value);
    });

    // replace express x-powered-by
    router.disable('x-powered-by');

    // Use x-powered-by middleware
    router.use(function(req, res, next) {
      if (app.enabled('x-powered-by')) res.setHeader('X-Powered-By', 'Baiji');
      next();
    });

    // Copy locals
    router.locals = _.assign({}, this.app.locals);

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
      let reqUrl = req.protocol + '://' + req.get('host');
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

    // Action wrapper
    const wrapper = (action) => {
      let isMiddleware = action.route.verb === 'use';

      return (req, res, next) => {
        // Initialize ctx with `req` and `res`
        let ctx = this.createContext(req, res, action, this.options);

        // Invoke action stack
        return action.invoke(ctx, function (ctx) {
          // Handle error
          if (ctx.error) return next(ctx.error);

          // If stack is invoked and ctx is finished, then do nothing
          if (ctx.isFinished()) return;

          // Allow express middleware to go next
          if (isMiddleware && typeof next === 'function') return next();
        });
      };
    };

    // Generate all actions and sort
    this.actions = this.createActionsBy(wrapper);

    // Sort actions, keep the middleware action in front of all other actions
    let middlewareActions = [];
    let normalActions = [];
    _.each(this.actions, function(action) {
      if (action.verb === 'use') {
        middlewareActions.push(action);
      } else {
        normalActions.push(action);
      }
    });

    // Save sorted actions
    this.sortedActions = middlewareActions.concat(normalActions.sort(utils.sortRoute));

    // Apply all actions
    _.each(this.sortedActions, function(route) {
      assert(router[route.verb], `Invalid route verb '${route.verb}' detected for action ${route.name}`);

      let args = [route.path];

      // Set up file upload support
      if (route.upload) {
        let uploadOpts = _.assign(app.get('upload') || {}, route.upload);

        // Check file upload options
        assert(
          uploadOpts.dest || uploadOpts.storage,
          `Missing upload dest or storage config for action ${route.name}`
        );

        // Add upload memory support
        if (uploadOpts.storage === 'memory') {
          uploadOpts.storage = multer.memoryStorage();
          delete uploadOpts.dest;
        }

        args.push(multer(uploadOpts).fields(uploadOpts.fields || []));
      }

      args.push(route.handler);

      // Add route
      router[route.verb].apply(router, args);
    });

    // Allow adapter reference from handler
    router.baijiAdapter = this;

    return router;
  }
};
