'use strict';

const _ = require('lodash');

module.exports = function mockResponse(data) {
  return function response(ctx) {
    return ctx.respond(_.clone(data));
  };
};
