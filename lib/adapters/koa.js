'use strict';

const assert = require('assert');
const debug = require('debug')('baiji:adapters:koa');
const KoaContext = require('../contexts/koa');
const Adapter = require('../Adapter');

// TODO: finsih koa adapter
module.exports = class KoaAdapter extends Adapter {
  constructor() {
    super();

    this.Context = KoaContext;
  }

  createHandler() {}

  createContext() {}
};
