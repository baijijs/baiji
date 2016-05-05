'use strict';

const delegate = require('delegates');
const Normalizer = require('baiji-normalizer');
const Context = require('../Context');
const utils = require('../utils');

const DEFAULT_SUPPORTED_TYPES = [
  'application/json', 'application/javascript', 'application/xml',
  'text/javascript', 'text/xml',
  'json', 'xml',
  '*/*'
];

class ExpressContext extends Context {
  constructor(req, res, method, options) {
    super(req, res, method, options);

    this.supportedTypes = this.options.supportedTypes || DEFAULT_SUPPORTED_TYPES;
    if (this.supportedTypes === DEFAULT_SUPPORTED_TYPES && !this.options.xml) {
      // Disable all XML-based types by default
      this.supportedTypes = this.supportedTypes.filter(function(type) {
        return !/\bxml\b/i.test(type);
      });
    }

    // Prepare options
    this.prepareOpts();

    this.contextType = 'ExpressContext';
  }

  prepareOpts() {
    // Construct delimiter regex if input was an array. Overwrite option
    // so this only needs to happen once.
    let delims = this.options.arrayItemDelimiters;
    if (Array.isArray(delims)) {
      delims = new RegExp(delims.map(utils.escapeRegExp).join('|'), 'g');
      this.options.arrayItemDelimiters = delims;
    }
  }

  buildArgs() {
    let args = {};
    let ctx = this;
    const accepts = ctx._method.accepts || [];

    let i;
    // build arguments from req and method options
    for (i = 0; i < accepts.length; i++) {
      let o = accepts[i];
      let httpFn = o.http;
      let name = o.name || o.arg;
      let val;
      let type = o.type || 'any';

      // This is an http method keyword, which requires special parsing.
      if (httpFn && typeof httpFn === 'function') {
        val = httpFn(ctx);
      } else {
        val = ctx.param(name);
        if (Normalizer.canConvert(type)) {
          val = Normalizer.convert(val, type, ctx.options);
        }
      }

      if (o.hasOwnProperty('default')) {
        val = val || o.default;
      }

      // set the argument value
      args[name] = val;
    }

    return args;
  }

  /**
   * Get an arg by name using the given options.
   *
   * @param {String} name
   * @param {Object} options **optional**
   */
  param(name) {
    let req = this.request;
    let args = req.params && req.params.args !== undefined ? req.params.args :
               req.body && req.body.args !== undefined ? req.body.args :
               req.query && req.query.args !== undefined ? req.query.args :
               undefined;

    if (args) {
      try {
        args = JSON.parse(args);
      } catch (e) { /* Do nothing */ }
    }

    if (typeof args !== 'object' || !args) {
      args = {};
    }

    let arg = (args && args[name] !== undefined) ? args[name] :
              req.params[name] !== undefined ? req.params[name] :
              (req.body && req.body[name]) !== undefined ? req.body[name] :
              req.query[name] !== undefined ? req.query[name] :
              req.get(name);

    // search these in order by name
    // req.params
    // req.body
    // req.query
    // req.header

    return arg;
  }

  done(data) {
    let ctx = this;

    // if response is already returned, then do nothing
    if (ctx._done) return;

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
            try {
              let xml = utils.toXML(data);
              ctx.send(xml);
            } catch (e) {
              ctx.send(500, e + '\n' + data);
            }
          }
          break;
        default:
          // not acceptable
          ctx.send(406);
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
    ctx._done = true;
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
let requestDelegator = delegate(proto, 'response');
requestDelegator
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
  .method('vary');

const markContextAsDone = function markContextAsDone() {
  this._done = true;
};

utils.interfere(requestDelegator)
  .interfere('json', markContextAsDone)
  .interfere('jsonp', markContextAsDone)
  .interfere('end', markContextAsDone)
  .interfere('download', markContextAsDone)
  .interfere('redirect', markContextAsDone)
  .interfere('render', markContextAsDone)
  .interfere('send', markContextAsDone)
  .interfere('sendFile', markContextAsDone)
  .interfere('sendStatus', markContextAsDone);
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
