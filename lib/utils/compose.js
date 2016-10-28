'use strict';

const Promise = require('any-promise');
const logError = require('./logError');

// execStack, borrowed from koa-compose
module.exports = function compose (stack, onError) {
  if (!Array.isArray(stack)) throw new TypeError('Stack stack must be an array!');
  for (const fn of stack) {
    if (typeof fn !== 'function') throw new TypeError('Stack must be composed of functions!');
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

      try {
        return Promise.resolve(fn(ctx, function() {
          return handleError(dispatch(i + 1));
        }));
      } catch (err) {
        return handleError(Promise.reject(err));
      }
    }

    // Handle possible error for each promise
    function handleError(promise) {
      if (canHandleError) {
        return promise.catch(function(err){
          ctx.error = err;
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
