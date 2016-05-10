'use strict';

module.exports = function addPrefix(obj, prefix) {
  let originalKeys = Object.keys(obj);
  let newObj = {};
  originalKeys.forEach(function(key) {
    let value = obj[key];
    key = prefix ? `${prefix}.${key}` : key;

    if (Array.isArray(value)) {
      newObj[key] = value.slice();
    } else {
      newObj[key] = value;
    }
  });

  return newObj;
};
