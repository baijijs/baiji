'use strict';

class Service {
  constructor(ctx) {
    let app = ctx.app;

    this.ctx = ctx;
    this.app = app;
    this.services = ctx.services;
    this.config = app.config;
    this.logger = app.logger;
  }
}

module.exports = Service;


// TODO:
const ctx = {};
const services = {};

function lazyInit() {
  let args = Array.from(arguments);
  let target = args.unshift();

  return new Proxy(target, {
    get(obj, key) {
      if (obj == null) return;

      let val = obj[key];
      if (val == null) return val;

      if (typeof val === 'function') return new val(...args);

      return lazyInit.apply(null, [val].concat(args));
    }
  });
}

Object.defineProperty(ctx, 'service', {
  get() {
    return lazyInit(services, this);
  }
})