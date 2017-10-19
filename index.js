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
createApplication.Controller = Controller;

// Expose `Method`
createApplication.Method = Method;

// Add version reference
createApplication.VERSION = require('../package.json').version;
