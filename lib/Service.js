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
