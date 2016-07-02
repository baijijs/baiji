'use strict';

let counter = Date.now() % 1e9;

// Get name of a function or return a random one
module.exports = function getName(obj) {
  let name = '__bj' + (Math.random() * 1e9 >>> 0) + (counter++ + '__');

  if (!obj) return name;

  if (typeof obj == 'function') return obj.name || name;

  if (typeof obj == 'string') return obj;

  return name;
};
