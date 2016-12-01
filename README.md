[Baiji](https://en.wikipedia.org/wiki/Baiji) (白鱀豚)
=======

>> Bring the beauty back to life.

> Under active development

Baiji (https://github.com/baijijs/baiji) is an easy to use and opinionated micro-framework for writing scalable and REST-like web applications.

Baiji is an ideal candidate for building robust, scalable and secure web things.

Features
--------
* Multiple adapters support: (Express)[https://github.com/expressjs/express], [Socket.io](https://github.com/socketio/socket.io), more supports will comming soon
* Hooks, enabling the power of scalability of your api method
* Modern Controller syntax
* Smart routes sorter
* Sweet debug info
* Built-in parameter filter
* Entities - a simple Facade to use with your models and API

Basic Use Case Preview
--------------

#### Using ES6 Syntax

```javascript
const baiji = require('baiji');
const app = baiji('my-example-app');

class UsersCtrl extends baiji.Controller {
  constructor() {
    super();
    // Use before actions
    this.beforeAction('signInRequired');
  }

  initConfig() {
    return {
      search: {
        description: 'Search users...',
        route: { path: '/', verb: 'get' }
      }
    }
  }

  signInRequired(ctx, next) {
    if (ctx.state.isSignedIn()) return next();
    ctx.done({ error: 'Unauthorized' });
  }

  search(ctx, next) {
    ctx.done([{ username: 'lyfeyaj', gender: 1 }], next);
  }
}

// Use express middleware: response-time
app.use(require('response-time')());
// Use express middleware: cookie-parser
app.use(require('cookie-parser')());

// Use controller
app.use(UsersCtrl);

// Start app and listen on port 3000
app.listen(3000);
```

TODOs
-----

* Add RPC support

License
-------
* [The MIT license](LICENSE)
