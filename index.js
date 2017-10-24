'use strict';

const Application = require('./lib/Application');
const Controller = require('./lib/Controller');
const Method = require('./lib/Method');

module.exports = createApplication;

function createApplication(name, settings) {
  return new Application(name, settings);
}

// Expose `Application`
createApplication.Application = Application;

// Expose `Controller`
createApplication.Controller = Application.Controller = Controller;

// Expose `Method`
createApplication.Method = Application.Method = Method;

// Add version reference
createApplication.VERSION = Application.VERSION = require('./package.json').version;
