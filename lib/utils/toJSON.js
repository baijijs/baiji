'use strict';

const _ = require('lodash');

function toJSON(input) {
  if (!input) return input;

  if (typeof input.toJSON === 'function') {
    return input.toJSON();
  } else if (Array.isArray(input)) {
    return _.map(input, toJSON);
  } else {
    return input;
  }
}

module.exports = toJSON;
