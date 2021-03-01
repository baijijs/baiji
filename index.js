'use strict';

const Application = require('./lib/Application');
const Controller = require('./lib/Controller');
const Action = require('./lib/Action');

module.exports = createApplication;

function createApplication(name, settings) {
  return new Application(name, settings);
}

// Expose `Application`
createApplication.Application = Application;

// Expose `Controller`
createApplication.Controller = Application.Controller = Controller;

// Expose `Action`
createApplication.Action = Application.Action = Action;

// Add version reference
createApplication.VERSION = Application.VERSION = require('./package.json').version;
