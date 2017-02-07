'use strict';

// Module dependencies
const Application = require('../Application');
const utils = require('../utils');
const chalk = require('chalk');
const _ = require('lodash');

// Constants
const logPrefix = chalk.blue.bold('  baiji:evaluator');

// Evaluator Plugin
module.exports = function evaluatorPlugin(app, options) {
  if (process.env.NODE_ENV === 'production') {
    utils.logWarning('evaluator plugin should not be used in production!');
  }

  options = options || {};
  let warningThreshold = options.warningThreshold || 20;

  function injectEvaluator(defaultName) {
    return function(fn) {

      return function(ctx, next) {
        let startedAt = +new Date();

        return fn(ctx, function() {
          let millis = +new Date() - startedAt;

          let name = (fn.name).replace(/^bound\ /, '').trim();
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
    };
  }

  // Hack composedMethods
  Application.prototype.composedMethods = function() {
    let beforeHooks = this.searchHooksByType('before');
    let afterHooks = this.searchHooksByType('after');
    let afterErrorHooks = this.searchHooksByType('afterError');

    let filter = utils.filterHooks;

    // Loop and then inject evaluator into all methods and hooks
    return _.map(this.allMethods(), function(method) {
      let name = method.fullName();

      // Inject evaluator into all hooks
      let beforeStack = _.map(filter(beforeHooks, name), injectEvaluator());
      let afterStack = _.map(filter(afterHooks, name), injectEvaluator());
      let afterErrorStack = _.map(filter(afterErrorHooks, name), injectEvaluator());

      method.fn = injectEvaluator(name)(method.fn);

      method.compose(
        beforeStack,
        afterStack,
        afterErrorStack
      );

      return method;
    });
  };
};
