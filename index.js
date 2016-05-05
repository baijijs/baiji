const Application = require('./lib/Application');

module.exports = createApplication;

function createApplication(name) {
  return new Application(name);
}

createApplication.Application = Application;
