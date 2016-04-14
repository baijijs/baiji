'use strict';

const isPromise = require('./isPromise');

module.exports = function(fn) {
  return function createPromise() {
    let self = this;
    return new Promise(function(resolve, reject) {
      let res;
      try {
        res = fn.apply(self, arguments);
      } catch (e) {
        reject(e);
      }

      if (isPromise(res)) {
        resolve(res);
      }
    });
  };
};
