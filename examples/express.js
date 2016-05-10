'use strict';

const baiji = require('../');
const debug = require('debug')('baiji:examples:express');

let app = baiji('myApp');

let ArticlesCtrl = baiji('articles');

ArticlesCtrl.before('index', function(ctx, next) {
  debug('before index executed.');
  setTimeout(next, 500);
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
  debug('afterError =>', ctx.error);
  ctx.done({ error: { name: ctx.error, stack: ctx.error.stack } });
  next();
});

ArticlesCtrl.define('index', {
  description: '获取文章列表',
  accepts: [
    { arg: 'q', type: 'string', description: 'keyword used for searching articles' }
  ],
  http: { verb: 'get', path: '/' }
}, function(ctx, next) {
  debug('method executed', ctx._method.fullName());
  next();
});

ArticlesCtrl.define('show', {
  description: '文章详情',
  http: { verb: 'get', path: '/' }
}, function(ctx, next) {
  debug('method executed', ctx._method.fullName());
  ctx.done({
    title: 'baiji usage',
    content: 'see readme.'
  });
  next();
});

app.before('*', function(ctx, next) {
  debug('before all executed.');
  next();
});

app.use(ArticlesCtrl, { mountpath: '/articles' });

app.listen(3005);
