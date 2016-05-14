'use strict';

const baiji = require('../');
const express = require('express');
const debug = require('debug')('baiji:examples:express');

// Handle all uncaughtException avoid node instance crashing
process.on('uncaughtException', function(e) {
  debug('uncaughtException', e, e.stack);
});

// Article Controller
let ArticlesCtrl = baiji('articles');

ArticlesCtrl.before('index', function(ctx, next) {
  debug('before index executed.');
  setTimeout(next, 200);
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

// Main app
let app = baiji('myApp');

// Allow string to be splited as array by specific delimiters
app.set('adapterOptions', { arrayItemDelimiters: ',' });

// Enable X-Powered-By
app.enable('x-powered-by');

// Handle all undefined routes
app.define('404', {
  description: 'handle 404',
  http: { verb: 'all', path: '*' }
}, function(ctx, next) {
  debug('method executed', ctx.methodName);
  ctx.done({
    error: {
      name: '404',
      message: `no url available for ${ctx.path}`
    }
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

// Mount Article Controller
app.use(ArticlesCtrl, { mountpath: '/articles' });

// Init a new express app
let subApp = express();

subApp.get('/info', function(req, res) {
  res.send('express app info');
});

// Mount express app
app.use(subApp, {
  name: 'subApp',
  desc: 'express App',
  mountpath: 'subApp',
  skipHooks: false
});

debug('app is listening on port 3005');
app.listen(3005);
