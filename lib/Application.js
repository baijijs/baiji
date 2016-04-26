'use strict';

const EventEmitter = require('events');
const assert = require('assert');

const Controller = require('./Controller');

module.exports = Application;

class Application extends EventEmitter {
  constructor(options) {
    super();

    if (!(this instanceof Application)) return new Application(options);

    this.beforeActions = [];
    this.afterActions  = [];
    this.afterErrorActions = [];
    this.controllers = [];
    this.plugins = [];
  }

  // function that will be apply to application instance before start
  plugin(fn, options) {
    options = options || {};
    assert(typeof fn == 'function', `${fn} must be a function`);
    this.plugins.push({ fn, options });
    return this;
  }

  // support Controller, Application, Express, Koa
  // let midware = function(req, res) {}
  //       =>
  //          Method('anonymous', {}, function(ctx, next) { return midware.call(this, ctx.request, ctx.response); // TODO handle next  })
  use() {

  }

  get() {

  }

  set() {

  }

  enable() {

  }

  get fullName() {

  }
}
