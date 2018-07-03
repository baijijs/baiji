'use strict';

// Module dependencies
const Application = require('../Application');
const utils = require('../utils');
const chalk = require('chalk');
const _ = require('lodash');

// Constants
const logPrefix = chalk.blue.bold('  baiji:evaluator');
const NODE_ENV = process.env.NODE_ENV || 'development';

// Evaluator Plugin
module.exports = function evaluatorPlugin(app, options) {
  options = options || {};
  options.restrictOnDev = options.restrictOnDev === true ? true : false;

  // Check if only support use on 'development' environment
  if (options.restrictOnDev && NODE_ENV !== 'development') {
    utils.logWarning('evaluator plugin should only be used in development env!');
  }

  let warningThreshold = options.warningThreshold || 20;

  function injectEvaluator(defaultName) {
    return function(handler) {
      if (handler.__EVALUATOR_INJECTED__) return handler;

      let _handler = function(ctx, next) {
        let startedAt = +new Date();

        return handler(ctx, function() {
          let millis = +new Date() - startedAt;

          let name = (handler.name).replace(/^bound /, '').trim();
          name = name || defaultName || '<anonymous>';

          let message = `${name} TIME COMSUMPTION: +${millis} ms`;

          if (millis >= warningThreshold) {
            // eslint-disable-next-line no-console
            console.log(logPrefix, chalk.red(message));
          } else {
            // eslint-disable-next-line no-console
            console.log(logPrefix, chalk.green(message));
          }
          return next();
        });
      };

      // Mark handler as evaluator injected to avoid inject multiple times
      _handler.__EVALUATOR_INJECTED__ = true;

      return _handler;
    };
  }

  // Hack composedActions
  Application.prototype.composedActions = function() {
    let beforeHooks = this.searchHooksByType('before');
    let afterHooks = this.searchHooksByType('after');
    let afterErrorHooks = this.searchHooksByType('afterError');
    let beforeRespondHooks = this.searchHooksByType('beforeRespond');

    let filter = utils.filterHooks;

    // Loop and then inject evaluator into all actions and hooks
    return _.map(this.allActions(), function(action) {
      let name = action.fullName();

      // Inject evaluator into all hooks
      let beforeStack = _.map(filter(beforeHooks, name), injectEvaluator());
      let afterStack = _.map(filter(afterHooks, name), injectEvaluator());
      let afterErrorStack = _.map(filter(afterErrorHooks, name), injectEvaluator());
      let beforeRespondStack = _.map(filter(beforeRespondHooks, name), injectEvaluator());

      action.handler = injectEvaluator(name)(action.handler);

      action.compose({
        before: beforeStack,
        after: afterStack,
        error: afterErrorStack,
        beforeRespond: beforeRespondStack
      });

      return action;
    });
  };
};
