'use strict';

// Module dependencies
const assert = require('assert');

// Automatically or manually handle `next` according to fn's arguments length
module.exports = function wrapperFn(fn) {
  assert(typeof fn === 'function', 'Method fn must be a valid function');

  // Manually handle next
  if (fn.length > 1) return fn;

  // Automatically handle next
  return (new Function('fn', 'Promise', `
    return function ${fn.name || ''}(ctx, next) {
      return Promise.resolve(fn.call(this, ctx)).then(next);
    }`
  ))(fn, Promise);
};
