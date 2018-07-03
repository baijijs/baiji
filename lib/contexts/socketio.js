'use strict';

const delegate = require('delegates');
const Context = require('../Context');
const _ = require('lodash');

class SocketIOContext extends Context {
  static create(socket, args, action, options) {
    return new SocketIOContext(socket, args, action, options);
  }

  constructor(socket, args, action, options) {
    // Call super
    super(socket.request, socket.request.res, action, options);

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

  async done(data, next) {
    let ctx = this;
    next = next || _.noop;

    // Save data
    ctx.result = data;

    // Avoid emitting data more than once
    if (!ctx.isFinished()) {
      data = await this.action.invoke('beforeRespondStack', ctx);

      ctx.emit('result', data);
    }

    // Mark request as complete
    ctx._done = true;

    // Call next
    return next();
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
