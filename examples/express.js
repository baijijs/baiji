'use strict';

const baiji = require('../');
const Controller = baiji.Controller;
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
    { name: 'q', type: 'string', description: 'keyword used for searching articles' },
    { name: 'ids', type: ['number'], description: 'article ids' }
  ],
  route: { verb: 'get', path: '/' }
}, function(ctx, next) {
  debug('method executed', ctx.methodName);
  ctx.done(ctx.args);
  next();
});

ArticlesCtrl.define('show', {
  description: 'fetch article detail',
  accepts: [
    { name: 'id', type: 'number', description: 'article id' }
  ],
  route: { verb: 'get', path: '/:id' }
}, function(ctx, next) {
  debug('method executed', ctx.methodName);
  ctx.done({
    title: 'baiji usage post',
    content: 'see readme.'
  });
  next();
});

class UsersCtrl extends Controller {
  constructor() {
    super();
    this.setName('users');

    // Add hooks
    this.beforeAction('loginRequired', { except: 'index' });
    this.beforeAction('checkAppExistance');
    this.beforeAction(function customBeforeAction(ctx, next) {
      debug('custom beforeAction called');
      next();
    }, { only: ['show'] });

    // Below syntax is equel to using `beforeAction`
    // this.preRequest = [
    //   ['loginRequired', { except: 'index' }],
    //   ['checkAppExistance'],
    //   [function customBeforeAction(ctx, next) {
    //     debug('custom beforeAction called');
    //     next();
    //   }, { only: ['show'] }]
    // ];

    // Below syntax is equel to using `beforeAction`
    // this.preRequest([
    //   ['loginRequired', { except: 'index' }],
    //   ['checkAppExistance'],
    //   [function customBeforeAction(ctx, next) {
    //     debug('custom beforeAction called');
    //     next();
    //   }, { only: ['show'] }]
    // ]);
  }

  initConfig() {
    return {
      index: { description: 'user list', route: { path: '/', verb: 'get' } },
      show: { description: 'user detail', route: { path: '/:id', verb: 'get' } }
    };
  }

  loginRequired(ctx, next) {
    debug('loginRequired executed');
    next();
  }

  checkAppExistance(ctx, next) {
    debug('checkAppExistance executed');
    next();
  }

  index(ctx, next) {
    debug('method executed', ctx.methodName);
    ctx.done([
      { id: 1, username: 'felix' },
      { id: 2, username: 'jenny' }
    ]);
    next();
  }

  show(ctx, next) {
    debug('method executed', ctx.methodName);
    this.handleApp();
    ctx.done({
      id: 1,
      username: 'felix'
    });
    next();
  }

  handleApp() {
    debug('UsersCtrl.prototype.handleApp called');
  }
}

// Main app
let app = baiji('myApp');

// Allow string to be splited as array by specific delimiters
app.set('adapterOptions', { arrayItemDelimiters: ',' });

// Enable X-Powered-By
app.enable('x-powered-by');

// Handle all undefined routes
app.define('404', {
  description: 'handle 404',
  route: { verb: 'all', path: '*' }
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
app.use(ArticlesCtrl, { mountPath: '/articles' });

// Mount User Controller
app.use(UsersCtrl, { mountPath: '/users' });

// Init a new express app
let subApp = express();

subApp.get('/info', function(req, res) {
  res.send('express app info');
});

// nested sub app
app.use(app, { mountPath: '/app' });

// Mount express app
app.use(subApp, {
  name: 'subApp',
  desc: 'express App',
  mountPath: 'subApp',
  skipHooks: false
});

debug('app is listening on port 3005');
app.listen(3005);
