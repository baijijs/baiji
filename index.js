const Application = require('./lib/Application');
const Controller = require('./lib/Controller');

module.exports = createApplication;

function createApplication(name, settings) {
  return new Application(name, settings);
}

createApplication.Application = Application;
createApplication.Controller = Controller;
