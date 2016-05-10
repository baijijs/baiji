'use strict';

const baiji = require('../');
const debug = require('debug')('baiji:examples:express');

let app = baiji('myApp');

let ArticlesCtrl = baiji('articles');

ArticlesCtrl.before('index', function(ctx, next) {
  debug('before index executed.');
  setTimeout(function() {
    next();
  }, 2000);
});

ArticlesCtrl.before('*', function(ctx, next) {
  debug('before * executed.');
  next();
});

ArticlesCtrl.after('index', function(ctx, next) {
  debug('after index executed.');
  next();
});

ArticlesCtrl.afterError('*', function(ctx, next) {
  debug('afterError * executed.');
  debug(ctx.error);
  ctx.done(ctx.error);
  next();
});

ArticlesCtrl.define('index', {
  accepts: [
    { arg: 'q', type: 'string', description: 'keyword used for searching articles' }
  ],
  http: { verb: 'get', path: '/' }
}, function(ctx, next) {
  debug('method executed', ctx._method.fullName());
  ctx.done(ctx.args);
  // throw new Error('throw error');
  // return Promise.reject(new Error('promise error'));
  next();
});

app.before('*', function(ctx, next) {
  debug('before all executed.');
  next();
});

app.use(ArticlesCtrl, { mountpath: '/articles' });

app.listen(3005);
