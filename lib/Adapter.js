const assert = require('assert');

// Basic Adapter apis that all child adapters should implement
module.exports = class Adapter {
  constructor(app, options) {
    assert(app && app.isBaiji, `${app} must be an Baiji app`);

    this.app = app;

    this.options = Object.assign({}, (app.settings || {}).adapterOptions || {});
    this.options = Object.assign(this.options, options || {});
  }

  /**
   * Return a request handler callback
   * for node's native http server.
   *
   * @return {Function}
   * @api public
   */
  callback() {}

  createHandler() {}

  /**
   * Initialize a new context.
   *
   * @api private
   */
  createContext() {}

  listen() {}
};
