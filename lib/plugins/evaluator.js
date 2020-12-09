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
      // Mark an injected flag
      if (handler.__EVALUATOR_INJECTED__) return handler;

      // A handler that can calculate time consumption for each action
      let _handler = function(ctx, next) {
        let startedAt = +new Date();

        return handler(ctx, function() {
          let millis = +new Date() - startedAt;

          // support anonymous function
          let name = (handler.name).replace(/^bound /, '').trim();
          name = name || defaultName || '<anonymous>';

          let message = `${name} TIME COMSUMPTION: +${millis} ms`;

          // If a function's execution time exceeding threshold, a warning is printed
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
  Application.prototype.composedActions = function(wrapper) {
    let hasWrapper = _.isFunction(wrapper);

    // Loop and then inject evaluator into all actions and hooks
    return _.map(this.allActions(), action => {
      let name = action.fullName;

      let hooks = {};

      _.each(this.hooks.types, type => {
        hooks[type] = _.map(
          this.hooks.filterBy(type, name),
          injectEvaluator()
        );
      });

      action.handler = injectEvaluator(name)(action.handler);

      action.compose(hooks);

      return hasWrapper ? wrapper(action) : action;
    });
  };
};
