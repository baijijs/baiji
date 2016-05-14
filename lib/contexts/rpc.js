'use strict';

const Context = require('../Context');

// TODO: finish rpc context
module.exports = class RpcContext extends Context {
  constructor(req, res, method, options) {
    super(req, res, method, options);
  }

  buildArgs() {

  }

  done() {}
};
