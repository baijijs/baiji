'use strict';

const baiji = require('../');

let app = baiji('myApp');

let ArticlesCtrl = baiji('articles');

ArticlesCtrl.before('index', function(ctx, next) {
  console.log('before index executed.');
  next();
});

ArticlesCtrl.after('index', function(ctx, next) {
  console.log('after index executed.');
  next();
});

ArticlesCtrl.define('index', {
  accepts: [
    { arg: 'q', type: 'string', description: 'keyword used for searching articles' }
  ],
  http: { verb: 'get', path: '/' }
}, function(ctx, next) {
  ctx.done(ctx.args);
  next();
});

app.use(ArticlesCtrl, { mountpath: '/articles' });

console.log(app.methods[0].fullPath());

app.listen(3005);
