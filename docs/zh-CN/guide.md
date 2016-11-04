介绍
===

## 安装

假设您已经安装了 [Node.js](https://nodejs.org/)，创建目录以保存应用程序，并将其设置为工作目录。

```bash
$ mkdir myapp
$ cd myapp
```

使用 `npm init` 命令为应用程序创建 `package.json` 文件。
有关 `package.json` 工作方式的更多信息，请参阅 [Specifics of npm's package.json handling](https://docs.npmjs.com/files/package.json)。

```bash
$ npm init
```

此命令提示您输入若干项，例如应用程序的名称和版本。
现在，只需按回车键以接受其中大多数项的缺省值，但以下情况例外：

```bash
$ entry point: (index.js)
```

输入 `app.js`，或者您希望使用的任何主文件名称。如果希望文件名为 `index.js`，请按回车键以接受建议的缺省文件名。

在 `app` 目录中安装 Baiji，然后将其保存在依赖项列表中。例如：

```bash
$ npm install baiji --save
```

要暂时安装 Baiji 而不将其添加到依赖项列表中，请省略 `--save` 选项：

```bash
$ npm install baiji
```

## Hellow World 例子

首先, 创建一个叫做 `myapp` 的目录, 进入此目录, 并运行 `npm init`。 然后安装 `baiji` 依赖。

在 `myapp` 目录中,  新建一个叫做 `app.js` 的文件, 并添加一下代码:

```js
var baiji = require('baiji');
var app = baiji('hello-world');

app.define({
  desc: 'my hello world example',
  route: { verb: 'get', path: '/' }
}, function(ctx, next) {
  ctx.done('Hello World!', next);
});

app.listen(3000, function() {
  console.log('Example app listening on port 3000!');
})
```

应用将会启动服务, 并在 3000 端口上监听连接, 此应用程序以“Hello World!”响应针对根 URL (`/`) 或*路由*的请求。对于其他所有路径，它将以 **404 Not Found** 进行响应。

运行一下命令来启动服务:

```sh
$ node app.js
```

然后，在浏览器中打开 [http://localhost:3000/](http://localhost:3000/) 以查看输出。

## 使用 ES6 来编写 Web 服务

使用 ES6 的 class 语法来编写的控制器需要继承 baiji.Controller 类, 示例代码如下:

```javascript

'use strict';

const baiji = require('baiji');
const app = baiji('using-controller');

class UsersCtrl extends baiji.Controller {
  constructor() {
    super();

    // 设置控制器名称
    this.setName('users');

    // 设置控制器默认挂在地址
    this.setMountPath('/users');

    // 设置过滤器
    this.beforeAction('signInRequired')
  }

  // 配置控制器出口方法, 参数以及路由等
  initConfig() {
    return {
      index: {
        description: '获取用户列表',
        route: { path: '/', verb: 'get' }
      }
    }
  }

  // 获取用户列表 方法
  index(ctx, next) {
    ctx.done([
      'user 1',
      'user 2'
    ], next);
  }

  signInRequired(ctx, next) {
    if (ctx.userSignedIn) next();
    ctx.throw(401);
  }
}

// 载入控制器
app.use(UsersCtrl);

// 启动服务
app.listen(3000, function() {
  console.log('Example app listening on port 3000!');
})
```
