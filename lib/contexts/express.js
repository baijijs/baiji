'use strict';

const delegate = require('delegates');
const magico = require('magico');
const Context = require('../Context');
const utils = require('../utils');

const DEFAULT_SUPPORTED_TYPES = [
  'application/json', 'application/javascript', 'application/xml',
  'text/javascript', 'text/xml',
  'json', 'xml',
  '*/*'
];

class ExpressContext extends Context {
  static create(req, res, method, options) {
    return new ExpressContext(req, res, method, options);
  }

  constructor(req, res, method, options) {
    // Call super
    super(req, res, method, options);

    // Set default supportedTypes
    this.supportedTypes = this.options.supportedTypes || DEFAULT_SUPPORTED_TYPES;
    if (this.supportedTypes === DEFAULT_SUPPORTED_TYPES && !this.options.xml) {
      // Disable all XML-based types by default
      this.supportedTypes = this.supportedTypes.filter(function(type) {
        return !/\bxml\b/i.test(type);
      });
    }

    // Build arguments for this context
    this.args = this.buildArgs();
  }

  /**
   * Get an arg by name using the given options.
   *
   * @param {String} name
   * @param {Object} options **optional**
   */
  param(name) {
    if (!name) return;
    let req = this.request;

    let args = magico.get(req.params, 'args') ||
               magico.get(req.body, 'args') ||
               magico.get(req.query, 'args') || void 0;

    let _args = utils.tryCatch(JSON.parse).call(void 0, args);
    if (_args !== utils.errorObj) args = _args;

    if (typeof args !== 'object' || !args) {
      args = {};
    }

    // search these in order by name
    // req.params
    // req.body
    // req.query
    // req.header
    let arg = magico.get(args, name);
    if (arg == null) arg = magico.get(req.params, name);
    if (arg == null) arg = magico.get(req.body, name);
    if (arg == null) arg = magico.get(req.query, name);
    if (arg == null) arg = req.get(name);

    return arg;
  }

  isFinished() {
    return this._done || this.response.headersSent || this.response.finished;
  }

  done(data, next) {
    let ctx = this;

    let hasNext = typeof next === 'function';

    // if response is already sent, then do nothing
    if (ctx.isFinished()) {
      if (hasNext) next();
      return;
    }

    // send the result back as
    // the requested content type
    let accepts = ctx.accepts(this.supportedTypes);

    if (ctx.query._format) {
      accepts = ctx.query._format.toLowerCase();
    }
    let dataExists = typeof data !== 'undefined';

    if (dataExists) {
      switch (accepts) {
        case '*/*':
        case 'application/json':
        case 'json':
          ctx.json(data);
          break;
        case 'application/javascript':
        case 'text/javascript':
          ctx.jsonp(data);
          break;
        case 'application/xml':
        case 'text/xml':
        case 'xml':
          if (accepts === 'application/xml') {
            ctx.header('Content-Type', 'application/xml');
          } else {
            ctx.header('Content-Type', 'text/xml');
          }
          if (data === null) {
            ctx.header('Content-Length', '7');
            ctx.end('<null/>');
          } else {
            let xml = utils.tryCatch(utils.toXML).call(void 0, data);
            if (xml === utils.errorObj) {
              ctx.status(500).send(xml.e + '\n' + data);
            } else {
              ctx.send(xml);
            }
          }
          break;
        default:
          // not acceptable
          ctx.sendStatus(406);
          break;
      }
    } else {
      if (!ctx.get('Content-Type')) {
        ctx.header('Content-Type', 'application/json');
      }
      if (ctx.statusCode === undefined || ctx.statusCode === 200) {
        ctx.statusCode = 204;
      }
      ctx.end();
    }

    // Mark ctx as done
    ctx._done = true;

    // Call next
    if (hasNext) next();
  }

  // Smarter header
  header(field, val) {
    if (typeof field === 'string' && arguments.length === 1) {
      return this.request.header(field);
    } else {
      return this.response.header(field, val);
    }
  }
}

const proto = ExpressContext.prototype;

/**
 * Express response delegation.
 */
let responseDelegater = delegate(proto, 'response');
responseDelegater
  .getter('headersSent')
  .getter('locals')

  .access('statusCode')

  .method('append')
  .method('attachment')
  .method('cookie')
  .method('clearCookie')
  .method('format')
  .method('get')
  .method('links')
  .method('location')
  .method('set')
  .method('status')
  .method('type')
  .method('contentType')
  .method('vary')
  .method('json')
  .method('jsonp')
  .method('end')
  .method('download')
  .method('redirect')
  .method('render')
  .method('send')
  .method('sendFile')
  .method('sendStatus');

/**
 * Express request delegation.
 */

delegate(proto, 'request')
  .method('accepts')
  .method('acceptsCharsets')
  .method('acceptsEncodings')
  .method('acceptsLanguages')
  .method('is')
  .method('range')

  .access('socket')
  .access('query')
  .access('params')
  .access('body')
  .access('url')
  .access('files')

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
  .getter('xhr')
  .getter('path')
  .getter('method')
  .getter('subdomains');

module.exports = ExpressContext;
