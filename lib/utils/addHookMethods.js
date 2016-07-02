'use strict';

const assert = require('assert');
const hookTypes = require('./hookTypes');
const addHookByType = require('./addHookByType');

// Add hook methods for class
module.exports = function addHookMethods(proto) {
  hookTypes.forEach(function(type) {
    // methodName, methodName1, methodName2, fn
    proto[type] = function addHook() {
      let args = Array.from(arguments);
      let fn = args.splice(args.length - 1, 1)[0];
      assert('function' == typeof fn, `${fn} must be a function`);

      addHookByType(this, type, args, fn);

      return this;
    };
  });
};
