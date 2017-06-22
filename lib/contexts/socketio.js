'use strict';

const delegate = require('delegates');
const Context = require('../Context');
const _ = require('lodash');

class SocketIOContext extends Context {
  static create(socket, args, method, options) {
    return new SocketIOContext(socket, args, method, options);
  }

  constructor(socket, args, method, options) {
    // Call super
    super(socket.request, socket.request.res, method, options);

    // Reference socket
    this.socket = socket;

    // Parameters
    this.args = args || {};
    this.buildArgs();
  }

  isFinished() {
    return this._done ||
           // Always treat proxy request as finished
           this._isMock;
  }

  done(data, next) {
    let ctx = this;
    next = next || _.noop;

    // Save data
    ctx.result = data;

    // Avoid emitting data more than once
    if (!ctx.isFinished()) ctx.emit('result', data);

    // Mark request as complete
    ctx._done = true;

    // Call next
    next();
  }
}

const proto = SocketIOContext.prototype;

delegate(proto, 'socket')
  .method('emit')
  .method('join')
  .method('leave')
  .method('to')

  .getter('rooms')
  .getter('client')
  .getter('id');

module.exports = SocketIOContext;
