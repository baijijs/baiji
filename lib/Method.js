'use strict';

const assert = require('assert');
const EventEmitter = require('events');
const path = require('path');
const utils = require('./utils');

class Method extends EventEmitter {
  constructor(name, options, fn) {
    super();

    this.name = name || options.name || utils.getName(fn);
    assert(typeof this.name === 'string', 'Method name must be a valid string');
    assert(typeof fn === 'function', 'Method fn must be a valid function');

    // Parent reference
    this.parent = null;

    this.stack = null;
    this.fn = fn;
    this.options = options || {};

    this.accepts = options.accepts || [];
    this.description = options.description;
    this.notes = options.notes;
    this.documented = options.documented !== false;

    this.http = options.http || {};
    if (!this.http.verb) this.http.verb = 'all';
    this.http.verb = String(this.http.verb).toLowerCase();
    if (!this.http.path) this.http.path = '/';

    this.multipart = options.multipart || {};

    // if accepts is not a array, then wrap it as an array
    if (this.accepts && !Array.isArray(this.accepts)) {
      this.accepts = [this.accepts];
    }
  }

  fullPath() {
    let segments = ['/'];
    if (this.parent) segments.push(this.parent.fullPath());
    segments.push(this.http.path);
    return path.join.apply(path, segments);
  }

  clone() {
    let method = Method(
      this.name,
      Object.assign({}, this.options),
      this.fn
    );

    method.stack = null;
    method.parent = this.parent;
    method.accepts = this.accepts.slice();
    method.description = this.description;
    method.notes = this.notes;
    method.documented = this.documented;
    method.http = Object.assign({}, this.http);
    method.multipart = Object.assign({}, this.multipart);

    return method;
  }

  fullName() {
    return this.parent ? `${this.parent.fullName()}.${this.name}` : this.name;
  }

  invoke() {
    assert(this.stack, `Method: '${this.fullName()}' is not composed before invoking`);

    return this.stack.apply(null, arguments);
  }

  compose(beforeStack, afterStack, afterErrorStack) {
    let stack = [].concat(beforeStack || [])
                  .concat(this.fn)
                  .concat(afterStack || []);

    let afterError = utils.compose(afterErrorStack || []);

    let fn = utils.compose(stack);

    this.stack = execStack;

    function execStack(context, next) {
      return fn(context, next).catch((context) => afterError(context, next));
    }
  }
}

Method.create = function(name, options, fn) {
  return new Method(name, options, fn);
};

module.exports = Method;
