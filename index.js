const Application = require('./lib/Application');

module.exports = createApplication;

function createApplication(name, settings) {
  return new Application(name, settings);
}

createApplication.Application = Application;
