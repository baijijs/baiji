'use strict';

const delegate = require('delegates');
const Context = require('../Context');

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
    return this._done;
  }

  done(data, next) {
    let ctx = this;

    // If response is not sent
    if (!ctx.isFinished()) {
      // Emit result to client
      ctx.emit('result', data);

      // Mark request as complete
      ctx._done = true;
    }

    // Call next
    if (typeof next === 'function') next();
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
