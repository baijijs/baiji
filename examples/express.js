'use strict';

const baiji = require('../');
const express = require('express');
const debug = require('debug')('baiji:examples:express');

let app = baiji('myApp');

app.set('adapterOptions', { arrayItemDelimiters: ',' });

app.enable('x-powered-by');

let ArticlesCtrl = baiji('articles');

ArticlesCtrl.before('index', function(ctx, next) {
  debug('before index executed.');
  setTimeout(next, 200);
});

process.on('uncaughtException', function(e) {
  debug('uncaughtException', e);
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

app.afterError('*', function(ctx, next) {
  debug('afterError * executed.');
  debug('afterError =>', ctx.error, ctx.error.stack);
  ctx.done({ error: { name: ctx.error, stack: ctx.error.stack } });
  next();
});

app.use(ArticlesCtrl, { mountpath: '/articles' });

let expressApp = express();

expressApp.get('/info', function(req, res) {
  res.send('express app info');
});

app.use(expressApp, { description: 'express App', name: 'subApp', mountpath: 'subapp' });

app.listen(3005);
