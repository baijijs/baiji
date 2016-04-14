const assert = require('assert');

module.exports = Adapter;

// Basic Adapter apis that all child adapters should implement
class Adapter {
  constructor(app, options) {
    assert(app && app.isBaiji, `${app} must be an Baiji app`);

    this.app = app;

    this.options = Object.assign({}, (app.options || {}).rest || {});
    this.options = Object.assign(this.options, options || {});
  }
}
