'use strict';

const _ = require('lodash');

module.exports = function addPrefix(obj, prefix) {
  let newObj = {};
  _.each(obj, function(value, key) {
    key = prefix ? `${prefix}.${key}` : key;

    if (Array.isArray(value)) {
      newObj[key] = value.slice();
    } else {
      newObj[key] = value;
    }
  });

  return newObj;
};
