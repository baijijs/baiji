'use strict';

const delegate = require('delegates');
const Normalizer = require('baiji-normalizer');
const Context = require('../Context');

module.exports = ExpressContext;

const proto = ExpressContext.prototype;

class ExpressContext extends Context {
  constructor(req, res, method, options) {
    super(req, res, method, options);
  }

  // {  }
  buildArgs() {
    const accepts = this._method.accepts;
    let args = {};

    for (let i = 0; i < accepts.length; i++) {
      let o = accepts[i];
    }

  }

  /**
   * Get an arg by name using the given options.
   *
   * @param {String} name
   * @param {Object} options **optional**
   */
  getArgByName() {
    let req = this.req;
    let args = req.params && req.params.args !== undefined ? req.params.args :
               req.body && req.body.args !== undefined ? req.body.args :
               req.query && req.query.args !== undefined ? req.query.args :
               undefined;

    if (args) {
      args = JSON.parse(args);
    }

    if (typeof args !== 'object' || !args) {
      args = {};
    }

    let arg = (args && args[name] !== undefined) ? args[name] :
              this.req.params[name] !== undefined ? this.req.params[name] :
              (this.req.body && this.req.body[name]) !== undefined ? this.req.body[name] :
              this.req.query[name] !== undefined ? this.req.query[name] :
              this.req.get(name);
    // search these in order by name
    // req.params
    // req.body
    // req.query
    // req.header

    return arg;
  }
}



/**
 * Express response delegation.
 */
delegate(proto, 'response')
  .getter('headersSent')
  .getter('locals')

  .method('append')
  .method('attachment')
  .method('cookie')
  .method('clearCookie')
  .method('download')
  .method('end')
  .method('format')
  .method('get')
  .method('json')
  .method('jsonp')
  .method('links')
  .method('location')
  .method('redirect')
  .method('render')
  .method('send')
  .method('sendFile')
  .method('sendStatus')
  .method('set')
  .method('status')
  .method('type')
  .method('vary');

/**
 * Express request delegation.
 */

delegate(proto, 'request')
  .method('accepts')
  .method('acceptsCharsets')
  .method('acceptsEncodings')
  .method('acceptsLanguages')
  .method('get')
  .method('is')
  .method('param')

  .access('socket')
  .access('query')
  .access('params')
  .access('body')
  .access('path')
  .access('url')

  .getter('origin')
  .getter('baseUrl')
  .getter('cookies')
  .getter('fresh')
  .getter('host')
  .getter('hostname')
  .getter('header')
  .getter('headers')
  .getter('ip')
  .getter('ips')
  .getter('originalUrl')
  .getter('protocol')
  .getter('route')
  .getter('secure')
  .getter('signedCookies')
  .getter('stale')
  .getter('method')
  .getter('subdomains');
