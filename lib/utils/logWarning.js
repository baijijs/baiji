'use strict';

const colors = require('colors/safe');

module.exports = function logError(msg) {
  msg = String(msg || '').valueOf();

  console.log(colors.yellow(`WARNING: ${msg}`));
};
