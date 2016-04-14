'use strict';

// execStack, borrowed from koa-compose

module.exports = function compose (stack) {
  if (!Array.isArray(stack)) throw new TypeError('Stack stack must be an array!');
  for (const fn of stack) {
    if (typeof fn !== 'function') throw new TypeError('Stack must be composed of functions!');
  }

  /**
   * @param {Object} context
   * @return {Promise}
   * @api public
   */

  return function (context, next) {
    // last called stack #
    let index = -1;
    return dispatch(0);
    function dispatch (i) {
      if (i <= index) return Promise.reject(new Error('next() called multiple times'));
      index = i;
      const fn = stack[i] || next;
      if (!fn) return Promise.resolve();
      try {
        return Promise.resolve(fn(context, function next () {
          return dispatch(i + 1);
        }));
      } catch (err) {
        return Promise.reject(err);
      }
    }
  };
};
