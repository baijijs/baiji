'use strict';

const delegate = require('delegates');
const _ = require('lodash');
const Context = require('../Context');
const utils = require('../utils');

const DEFAULT_SUPPORTED_TYPES = [
  'application/json', 'application/javascript', 'application/xml',
  'text/javascript', 'text/xml',
  'json', 'xml',
  '*/*'
];

class ExpressContext extends Context {
  static create(req, res, action, options) {
    return new ExpressContext(req, res, action, options);
  }

  constructor(req, res, action, options) {
    // Call super
    super(req, res, action, options);

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

    let args = _.get(req.params, 'args') ||
               _.get(req.body, 'args') ||
               _.get(req.query, 'args') || void 0;

    //  Try to parse as JSON
    if (args && _.isString(args)) {
      try {
        args = JSON.parse(args);
      } catch (error) {
        // do nothing
      }
    }

    if (typeof args !== 'object' || !args) args = {};

    // search these in order by name
    // req.params
    // req.body
    // req.query
    // req.header
    let arg = _.get(args, name);
    if (arg == null) arg = _.get(req.params, name);
    if (arg == null) arg = _.get(req.body, name);
    if (arg == null) arg = _.get(req.query, name);
    if (arg == null) arg = req.get(name);

    return arg;
  }

  isFinished() {
    return this._done ||
           this.response.headersSent ||
           this.response.finished ||
           // Always treat proxy request as finished
           this._isMock;
  }

  // TODO: add 'beforeRespond' hooks
  async done(data, next) {
    let ctx = this;

    next = next || _.noop;

    // Save data
    ctx.result = data;

    // Avoid sending data more than once
    if (!ctx.isFinished()) {

      data = await this.action.invokeBeforeRespond(ctx);

      // send the result back as
      // the requested content type
      let accepts = ctx.accepts(this.supportedTypes);

      if (ctx.query._format) {
        accepts = ctx.query._format.toLowerCase();
      }
      let dataExists = typeof data !== 'undefined';

      // Allow user specified content-type
      let contentType = ctx.response.get('Content-Type');
      let hasAccept = ctx.get('Accept');

      // If client do not send Accept header, then use user defined content-type
      if (!hasAccept && contentType) {
        accepts = contentType.toLowerCase();
      }

      if (dataExists) {
        switch (accepts) {
          case '*/*':
            if (contentType) {
              ctx.send(data);
            } else {
              ctx.json(data);
            }
            break;
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
                ctx.status(500).send(e + '\n' + data);
              }
            }
            break;
          default:
            if (accepts) {
              ctx.send(data);
            } else {
              // not acceptable
              ctx.sendStatus(406);
            }
            break;
        }
      } else {
        if (!contentType) {
          ctx.header('Content-Type', 'application/json');
        }
        if (ctx.statusCode === undefined || ctx.statusCode === 200) {
          ctx.statusCode = 204;
        }
        ctx.end();
      }
    }

    // Mark ctx as done
    ctx._done = true;

    // Emit finish event
    ctx.emit('finish', ctx);

    // Call next
    return next();
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
  .method('download')
  .method('end')
  .method('format')
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
  .method('is')
  .method('get')
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
