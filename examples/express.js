'use strict';

const baiji = require('../');
const path = require('path');
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
  params: [
    { name: 'q', type: 'string', description: 'keyword used for searching articles' },
    { name: 'ids', type: ['number'], description: 'article ids' }
  ],
  route: { verb: 'get', path: '/' }
}, function(ctx, next) {
  debug('method executed', ctx.actionName);
  ctx.respond(ctx.args);
  next();
});

ArticlesCtrl.define('show', {
  description: 'fetch article detail',
  params: [
    { name: 'id', type: 'number', description: 'article id' }
  ],
  route: { verb: 'get', path: '/:id' }
}, function(ctx, next) {
  debug('method executed', ctx.actionName);
  ctx.respond({
    id: ctx.args.id,
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

    this.beforeRespond('handleResult');
  }

  initConfig() {
    return {
      index: {
        description: 'user list',
        route: { path: '/', verb: 'get' }
      },
      show: {
        description: 'user detail',
        route: { path: '/:id', verb: 'get' }
      },
      uploadAvatar: {
        description: 'upload user avatar',
        upload: {
          fields: [{ name: 'avatar', maxCount: 1 }],
          dest: path.join(__dirname, './uploadAvatar')
        },
        route: { path: '/upload_avatar', verb: 'post' }
      }
    };
  }

  loginRequired(ctx, next) {
    debug('loginRequired executed');
    next();
  }

  handleResult() {
    debug('handleResult executed');
    return { changed: 'aha' };
  }

  checkAppExistance(ctx, next) {
    debug('checkAppExistance executed');
    next();
  }

  index(ctx, next) {
    debug('method executed', ctx.actionName);
    ctx.respond([
      { id: 1, username: 'felix' },
      { id: 2, username: 'jenny' }
    ]);
    next();
  }

  show(ctx, next) {
    debug('method executed', ctx.actionName);
    this.handleApp();
    ctx.respond({
      id: 1,
      username: 'felix'
    });
    next();
  }

  uploadAvatar(ctx, next) {
    debug('method executed', ctx.actionName);
    debug('body parameters', ctx.body);
    ctx.respond(ctx.files, next);
  }

  handleApp() {
    debug('UsersCtrl.prototype.handleApp called');
  }
}

// Main app
let app = baiji('myApp');

// Allow string to be splited as array by specific delimiters
app.set('adapterOptions.arrayItemDelimiters', ',');

// Enable X-Powered-By
app.enable('x-powered-by');

// Handle all undefined routes
app.define('404', {
  description: 'handle 404',
  route: { verb: 'all', path: '*' }
}, function(ctx, next) {
  debug('method executed', ctx.actionName);
  ctx.respond({
    error: {
      name: '404',
      message: `no url available for ${ctx.method.toUpperCase()} ${ctx.path}`
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
  ctx.respond({ error: { name: ctx.error, stack: ctx.error.stack } });
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

// Enable evaluator plugin
app.plugin('evaluator');

app.set('upload', { dest: path.join(__dirname, './upload') });

debug('app is listening on port 3005');
app.listen(3005);
