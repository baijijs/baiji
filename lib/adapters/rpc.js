'use strict';

const assert = require('assert');
const debug = require('debug')('baiji:adapters:rpc');
const RpcContext = require('../contexts/rpc');
const Adapter = require('../Adapter');

// TODO: finish rpc adapter
module.exports = class KoaAdapter extends Adapter {
  constructor() {
    super();

    this.Context = RpcContext;
  }

  createHandler() {}

  createContext() {}
};
