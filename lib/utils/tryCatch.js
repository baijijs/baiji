'use strict';

// Inspired by https://github.com/petkaantonov/bluebird/wiki/Optimization-killers#2-unsupported-syntax

const errorObj = require('./errorObj');
const assert = require('assert');

let tryCatchTarget;

function tryCatcher() {
  try {
    let target = tryCatchTarget;
    tryCatchTarget = null;
    return target.apply(this, arguments);
  } catch (e) {
    errorObj.e = e;
    return errorObj;
  }
}

function tryCatch(fn) {
  assert(typeof fn === 'function');
  tryCatchTarget = fn;
  return tryCatcher;
}

module.exports = tryCatch;
