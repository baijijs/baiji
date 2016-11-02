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
  }

  isFinished() {
    return this._done;
  }

  invoke() {
    let ctx = this;
    let data = this._body;

    // if response is already sent, then do nothing
    if (ctx.isFinished()) return;

    // Mark request as complete
    ctx._done = true;

    // Emit result to client
    ctx.emit('result', data);
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
