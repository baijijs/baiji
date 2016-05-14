'use strict';

const baiji = require('../');
const debug = require('debug')('baiji:examples:socketio');

let app = baiji('myApp');
app.set('adapter', 'socketio');

app.define('*', {
  description: 'handle unknown method'
}, function(ctx, next) {
  debug('method executed', ctx.methodName);
  ctx.done({ error: { name: 'no method error', message: `no method called ${ctx.clientMethodName}` } });
  next();
});

let ArticlesCtrl = baiji('articles');

ArticlesCtrl.before('index', function(ctx, next) {
  debug('before index executed.');
  setTimeout(next, 200);
});

process.on('uncaughtException', function(e) {
  debug('uncaughtException', e, e.stack);
});

ArticlesCtrl.before('*', function(ctx, next) {
  debug('before * executed.');
  next();
});

ArticlesCtrl.after('index', function(ctx, next) {
  debug('after index executed.');
  next();
});

ArticlesCtrl.define('index', {
  description: 'fetch article list',
  accepts: [
    { arg: 'q', type: 'string', description: 'keyword used for searching articles' },
    { arg: 'ids', type: ['number'], description: 'article ids' }
  ],
  http: { verb: 'get', path: '/' }
}, function(ctx, next) {
  debug('method executed', ctx.methodName);
  ctx.done(ctx.args);
  next();
});

ArticlesCtrl.define('show', {
  description: 'fetch article detail',
  accepts: [
    { arg: 'id', type: 'number', description: 'article id' }
  ],
  http: { verb: 'get', path: '/:id' }
}, function(ctx, next) {
  debug('method executed', ctx.methodName);
  ctx.done({
    title: 'baiji usage post',
    content: 'see readme.'
  });
  next();
});

app.before('*', function(ctx, next) {
  debug('before all executed.');
  next();
});

app.after('*', function(ctx, next) {
  debug('after all executed.');
  next();
});

app.afterError('*', function(ctx, next) {
  debug('afterError * executed.');
  debug('afterError =>', ctx.error, ctx.error.stack);
  ctx.done({ error: { name: ctx.error, stack: ctx.error.stack } });
  next();
});

app.use(ArticlesCtrl);

app.listen(3006);
debug('app is listening on port 3006');
