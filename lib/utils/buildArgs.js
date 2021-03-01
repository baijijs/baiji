'use strict';

const Normalizer = require('baiji-normalizer');
const _ = require('lodash');

// Build args by context, parameters defination and raw arguments
// Example:
// [
//   { name: 'gender', type: 'string' },
//   { name: 'profile', type: 'object', params: [{ name: 'age', type: 'number' }] },
//   { name: 'hobbies', type: ['string'] }
//   { name: 'hobbies', type: ['array'], params: [{ type: 'string' }] }
// ]
function buildArgs(ctx, params, rawArgs, fromContext, parentType) {
  let isArrayType = parentType === 'array';

  params = params || [];
  let args = isArrayType ? [] : {};

  let i;
  // build arguments from req and method options
  for (i = 0; i < params.length; i++) {
    let o = params[i];
    let name = isArrayType ? i : (o.name || o.arg);
    let val;
    let type = o.type || 'any';

    // This is an http method keyword, which requires special parsing.
    if (o.value != null) {
      if (typeof o.value === 'function') {
        val = o.value(ctx);
      } else {
        val == _.clone(o.value);
      }
    } else {
      val = fromContext ? ctx.param(name) : _.get(rawArgs, name);
      val = _.clone(val);
    }

    // Parse inner parameters
    if (o.params) {
      if (_.isArray(type)) {
        let parentType = type[0];
        val = Normalizer.convertArray(val, ctx.options);
        val = _.map(val, function(v) {
          return buildArgs(ctx, o.params, v, false, parentType);
        });
      } else {
        val = buildArgs(ctx, o.params, val, false, type);
      }
    } else {
      // Try to convert value
      val = Normalizer.tryConvert(val, type, ctx.options);
    }

    // Set default value
    if (val == null && o.hasOwnProperty('default')) {
      val = o.default;
    }

    // set the argument value
    if (val !== undefined) args[name] = val;
  }

  return args;
}

module.exports = buildArgs;
