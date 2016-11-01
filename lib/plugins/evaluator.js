'use strict';

const Application = require('../Application');
const utils = require('../utils');
const debug = require('baiji:evaluator');

function injectEvaluator(name) {
  return function(hook) {
    return function(ctx, next) {
      let startedAt = +new Date();
      return hook(ctx, function() {
        debug(`${hook.name || name || 'anonymous'} TIME COST`, `${+new Date() - startedAt} ms`);
        return next();
      });
    };
  };
}

Application.prototype.composedMethods = function() {
  let beforeHooks = this.searchHooksByType('before');
  let afterHooks = this.searchHooksByType('after');
  let afterErrorHooks = this.searchHooksByType('afterError');

  return this.allMethods().map((method) => {
    let name = method.fullName();

    let beforeStack = utils.filterHooks(beforeHooks, name);
    let afterStack = utils.filterHooks(afterHooks, name);
    let afterErrorStack = utils.filterHooks(afterErrorHooks, name);

    beforeStack = beforeStack.map(injectEvaluator());
    afterStack = afterStack.map(injectEvaluator());
    afterErrorStack = afterErrorStack.map(injectEvaluator());

    method.fn = injectEvaluator(name)(method.fn);

    method.compose(
      beforeStack,
      afterStack,
      afterErrorStack
    );

    return method;
  });
};

module.exports = function evaluatorPlugin() {};
