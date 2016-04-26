'use strict';

const assert = require('assert');
const EventEmitter = require('events');
const utils = require('./utils');

module.exports = class Method extends EventEmitter {
  constructor(name, options, fn) {
    super();

    this.name = name || utils.getName(fn);
    assert(this.name, 'Method name must be a valid string');
    assert(fn, 'Method fn must be a valid function');

    this.stack = null;
    this.fn = fn;
    this.options = options || {};
  }

  clone() {

  }

  set() {

  }

  compose(beforeStack, afterStack, afterErrorStack) {
    let stack = [].concat(beforeStack)
                  .concat(this.fn)
                  .concat(afterStack);

    let afterError = utils.compose(afterErrorStack);

    let fn = utils.compose(stack);

    this.stack = execStack;

    function execStack(context, next) {
      return fn(context, next).catch((context) => afterError(context, next));
    }
  }
};
