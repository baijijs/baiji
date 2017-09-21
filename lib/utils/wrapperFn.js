'use strict';

// Module dependencies
const assert = require('assert');
const Promise = require('any-promise');

// Automatically or manually handle `next` according to fn's arguments length
module.exports = function wrapperFn(fn) {
  assert(typeof fn === 'function', 'Method fn must be a valid function');

  // Manually handle next
  if (fn.length > 1) return fn;

  // Automatically handle next
  return function(ctx, next) {
    return Promise.resolve(fn.call(this, ctx)).then(next);
  };
};
