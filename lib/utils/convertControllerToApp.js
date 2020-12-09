'use strict';

const _ = require('lodash');
const assert = require('assert');

// Convert controller to app
module.exports = function convertControllerToApp(ctrl, app) {
  // Set __init_ctrl__ beforeHook for a clean invoking context of hook and action
  app.before('*', async function __init_ctrl__(ctx, next) {
    // non-configurable `__ctrl__`
    Object.defineProperty(ctx, '__ctrl__', {
      configurable: false,
      value: Object.create(ctrl)
    });

    await next();
  });

  // Loop through ctrl.__configs and add actions and collect action names
  const actionNames = _.map(ctrl.__configs, function(conf = {}, name) {
    let fn = ctrl[name];

    assert(
      _.isFunction(fn) || conf.mock != null,
      `No action named '${name}' defined for Controller '${name}'`
    );

    let _fn;

    // Keep `ctrl` as action context
    if (fn) _fn = (ctx, next) => fn.call(ctx.__ctrl__, ctx, next);

    // Define actions by action name and config one by one
    app.define(name, conf, _fn);

    return name;
  });

  // Loop through ctrl.__hooksConfig and add hook for app
  _.each(ctrl.__hooksConfig, function(hooks, hookType) {
    _.each(hooks, function(hookConfig) {
      let onlies = hookConfig.options.only;
      let excepts = hookConfig.options.except;

      let hookedActionNames = [];

      // add hook for allowed actions
      _.each(actionNames, function(actionName) {
        // except has higher priority
        if (~excepts.indexOf('*') || ~excepts.indexOf(actionName)) return;
        if (~onlies.indexOf('*') || ~onlies.indexOf(actionName)) {
          hookedActionNames.push(actionName);
        }
      });

      // Construct a named function with ctrl as invoke context
      let hookFn = (new Function('hook', `
        return function ${hookConfig.fn.name || ''}(ctx, next) {
          return hook.call(ctx.__ctrl__, ctx, next);
        }`
      ))(hookConfig.fn);

      // Apply hooks
      if (hookedActionNames.length) app[hookType](hookedActionNames, hookFn);
    });
  });

  return app;
};