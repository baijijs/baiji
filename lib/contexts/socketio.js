'use strict';

const delegate = require('delegates');
const Context = require('../Context');

class SocketIOContext extends Context {
  constructor(socket, args, method, options) {
    super(socket.request, socket.request.res, method, options);
    this.socket = socket;
    this.args = args;
  }

  done(data, next) {
    let ctx = this;

    // if response is already sent, then do nothing
    if (ctx._done) {
      if (typeof next === 'function') next();
      return;
    }

    ctx.emit('result', data);
    ctx._done = true;
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
