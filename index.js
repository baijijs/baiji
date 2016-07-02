'use strict';

const Application = require('./lib/Application');
const Controller = require('./lib/Controller');

module.exports = createApplication;

function createApplication(name, settings) {
  return new Application(name, settings);
}

// Expose `Application`
createApplication.Application = Application;

// Expose `Controller`
createApplication.Controller = Controller;
