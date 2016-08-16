'use strict';

const assert = require('assert');
const EventEmitter = require('events');
const path = require('path');
const utils = require('./utils');

const adapterNames = ['express', 'socketio', 'koa', 'rpc'];

class Method extends EventEmitter {
  static create(name, options, fn) {
    return new Method(name, options, fn);
  }

  constructor(name, options, fn) {
    super();

    this.name = name || options.name || utils.getName(fn);
    assert(typeof this.name === 'string', 'Method name must be a valid string');
    assert(typeof fn === 'function', 'Method fn must be a valid function');

    // Parent reference
    this.parent = null;

    // Stack to be executed, must be composed before server starts
    this.stack = null;

    // Main function
    this.fn = fn;

    // Method options
    this.options = options || {};

    // Parameters accpetance schema
    this.accepts = options.accepts || [];

    // Method description, notes for debug info and documentation usage
    this.description = options.description || options.desc || name;
    this.notes = options.notes;
    this.documented = options.documented !== false;

    // Method route config
    this.http = options.http || {};
    if (!this.http.verb) this.http.verb = 'all';
    this.http.verb = String(this.http.verb).toLowerCase();
    if (!this.http.path) this.http.path = '/';

    // TODO: Add built in multipart support
    this.multipart = options.multipart || {};

    // Set supported adapters
    if (!options.adapter) options.adapter = ['all'];
    if (!Array.isArray(options.adapter)) options.adapter = [options.adapter];
    if (~options.adapter.indexOf('all')) {
      this.adapter = adapterNames.slice();
    } else {
      this.adapter = options.adapter;
      // check adapter validation
      this.adapter.forEach((adapter) => {
        assert(~adapterNames.indexOf(adapter), `Invalid adapter name found: '${adapter}'`);
      });
    }

    // if accepts is not a array, then wrap it as an array
    if (this.accepts && !Array.isArray(this.accepts)) {
      this.accepts = [this.accepts];
    }

    // Skip beforeHooks and afterHooks or not, default is `true` when http.verb is `use` otherwise `false`
    this.skipHooks = this.http.verb === 'use';
    if (this.options.skipHooks === true) {
      this.skipHooks = true;
    } else if (this.options.skipHooks === false) {
      this.skipHooks = false;
    }
  }

  // Check whether a method is support a specific adapter
  isSupport(adapterName) {
    return !!~this.adapter.indexOf(adapterName);
  }

  fullPath() {
    let segments = ['/'];
    if (this.parent) segments.push(this.parent.fullPath());
    segments.push(this.http.path);
    return path.join.apply(path, segments);
  }

  clone() {
    let method = new Method(
      this.name,
      Object.assign({}, this.options),
      this.fn
    );

    method.stack = null;
    method.adapter = this.adapter.slice();
    method.skipHooks = this.skipHooks;
    method.parent = this.parent;
    method.accepts = Object.assign([], this.accepts);
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
    assert(this.stack, `Method: '${this.fullName()}' must be composed before invoking`);

    return this.stack.apply(null, arguments);
  }

  compose(beforeStack, afterStack, afterErrorStack) {
    let stack = [].concat(this.skipHooks ? [] : (beforeStack || []))
                  .concat(this.fn)
                  .concat(this.skipHooks ? [] : (afterStack || []));

    let afterError = utils.compose(afterErrorStack || []);

    this.stack = utils.compose(stack, afterError);
  }
}

module.exports = Method;
