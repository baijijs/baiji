'use strict';

const methods = require('methods');
const assert = require('assert');
const getName = require('./getName');

// Add hook methods for class
module.exports = function addHttpMethods(proto) {
  methods.forEach(function(method) {
    assert(!proto[method], `Duplicate \`${method}\` method for \`Application\` detected`);

    proto[method] = function (path) {
      // app.get(setting)
      if (method === 'get' && arguments.length === 1) {
        return this.set(path);
      }

      assert(
        this.get('adapter') !== 'express',
        `\`${method}\` can only be used for express adapter`
      );

      let args = arguments.length === 1 ? [arguments[0]] : Array.apply(null, arguments);

      let fn = args[args.length - 1];

      // Parse options
      let options = typeof path === 'object' ? path : {};
      if (args.length >= 3) {
        if (typeof args[1] === 'object') {
          options = Object.assign({}, args[1]);
        }
      }
      options.route = { verb: method, path: path };

      let name = options.name || getName(fn);

      // Set before hooks
      args.forEach(function(arg, i) {
        if (i < 1) return;
        if (i > args.length - 1) return;
        assert(typeof arg === 'function', 'Middlewares must be functions');
        this.before(name, arg);
      });

      // Define method
      return this.define(name, options, fn);
    };
  });
};
