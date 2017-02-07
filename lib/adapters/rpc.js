'use strict';

const assert = require('assert');
const debug = require('debug')('baiji:adapters:rpc');
const RpcContext = require('../contexts/rpc');
const Adapter = require('../Adapter');

// TODO: Implement rpc adapter
module.exports = class RpcAdapter extends Adapter {
  constructor() {
    super();

    this.Context = RpcContext;
  }

  createHandler() {}

  createContext() {}
};
