'use strict';

const logError = require('./logError');

// execStack, borrowed from koa-compose
module.exports = function compose (stack, onError) {
  if (!Array.isArray(stack)) throw new TypeError('Stack must be an array!')
  for (const fn of stack) {
    if (typeof fn !== 'function') throw new TypeError('Stack must be composed of functions!')
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
      let fn = stack[i];
      if (i === stack.length) fn = next;
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
      return promise.catch(function(err) {
        ctx = ctx || {};

        // add error
        ctx.error = err;
        ctx.errorHandled = false;

        // If has event, then emit error
        if (ctx.emit) ctx.emit('error', ctx);

        // If no error handler, then stop stack and go next
        if (!canHandleError) return next(ctx);

        // Handle error
        ctx.errorHandled = true;
        return onError(ctx, next).catch(function(e) {
          ctx.errorHandled = false;
          // Log catched error in onError
          if (e) logError(`[${new Date()}] ${e.name || e.message} \n ${e.stack}`);
        });
      });
    }
  };
};
