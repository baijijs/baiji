'use strict';

const EventEmitter = require('events');

module.exports = Application;

class Application extends EventEmitter {
  constructor(options) {
    super();

    if (!(this instanceof Application)) return new Application(options);

    this.beforeActions = [];
    this.afterActions  = [];
    this.afterErrorActions = [];
    this.controllers = [];
  }

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
