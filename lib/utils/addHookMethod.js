'use strict';

const assert = require('assert');

module.exports = function addHookMethod(proto, type) {
  proto[type] = function addHook() {
    let args = Array.from(arguments);
    let fn = args.splice(args.length - 1, 1)[0];
    assert('function' == typeof fn, `${fn} must be a function`);

    let i = args.length;

    let key = `_${type}Actions`;

    while (i--) {
      let hookName = `${type}.${args[i]}`;
      if (!this[key][hookName]) {
        this[key][hookName] = [fn];
      } else {
        this[key][hookName].push(fn);
      }
    }
  };
};
