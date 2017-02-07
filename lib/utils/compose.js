'use strict';

const Promise = require('any-promise');
const assert = require('assert');
const logError = require('./logError');
const tryCatch = require('./tryCatch');
const errorObj = require('./errorObj');

// execStack, borrowed from koa-compose
module.exports = function compose (stack, onError) {
  assert(Array.isArray(stack), 'Stack stack must be an array!');
  for (const fn of stack) {
    assert(typeof fn === 'function', 'Stack must be composed of functions!');
  }

  const canHandleError = typeof onError === 'function';

  /**
   * Compose `stack` returning
   * a fully valid stack comprised
   * of all those which are passed.
   * @param {Object} ctx
   * @return {Promise}
   * @api public
   */
  return function (ctx, next) {
    // last called stack #
    let index = -1;
    return dispatch(0);
    function dispatch (i) {
      if (i <= index) return Promise.reject(new Error('next() called multiple times'));
      index = i;
      const fn = stack[i] || next;

      // If nothing to execute, return empty promise
      if (!fn) return Promise.resolve();

      let res = tryCatch(fn).call(void 0, ctx, function () {
        return handleError(dispatch(i + 1));
      });

      if (res === errorObj) {
        return handleError(Promise.reject(res.e));
      } else {
        return Promise.resolve(res);
      }
    }

    // Handle possible error for each promise
    function handleError(promise) {
      if (canHandleError) {
        return promise.catch(function(err) {
          if (ctx) {
            ctx.error = err;
          } else {
            ctx = { error: err };
          }
          return onError(ctx, next).catch(function(err) {
            // Log catched error in onError
            logError(`[${new Date()}] ${err.name || err.message} \n ${err.stack}`);
          });
        });
      } else {
        return promise;
      }
    }
  };
};
