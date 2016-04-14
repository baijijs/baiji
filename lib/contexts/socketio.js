'use strict';

const Normalizer = require('baiji-normalizer');
const Context = require('../Context');

module.exports = SocketIOContext;

const proto = SocketIOContext.prototype;

class SocketIOContext extends Context {
  constructor() {

  }
}


let app = require('http').createServer(function(req, res) {
  // TODO, handling the request and response
});
let io = require('socket.io')(app);
