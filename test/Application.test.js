'use strict';

const expect = require('chai').expect;
const Application = require('../lib/Application');
const Method = require('../lib/Method');
const Controller = require('../lib/Controller');

const DEFAULT_SETTINGS = { adapter: 'express', env: 'development', description: '', 'x-powered-by': true };

describe('class Application', function() {
  let app;

  beforeEach(function() {
    app = new Application('test', {});
  });

  describe('constructor(name, settings)', function() {
    [
      ['name', 'test'],
      ['beforeHooks', {}],
      ['afterHooks', {}],
      ['afterErrorHooks', {}],
      ['settings', DEFAULT_SETTINGS],
      ['methods', []],
      ['mountedApps', []],
      ['locals', { settings: DEFAULT_SETTINGS }],
      ['mountPath', '/']
    ].forEach(function(prop) {
      it(`should have property '${prop[0]}' and corresponding value`, function() {
        expect(app).to.have.property(prop[0]).deep.eq(prop[1]);
      });
    });

    it('should be a valid instance of Application class', function() {
      expect(app).to.be.an.instanceof(Application);
    });
  });

  describe('setName(name)', function() {
    it('should change app name', function() {
      expect(app).to.have.a.property('name', 'test');
      app.setName('app');
      expect(app).to.have.a.property('name', 'app');
    });
  });

  describe('getName()', function() {
    it('should return app name', function() {
      expect(app.getName()).to.eq(app.name);
    });
  });

  describe('setMountPath(path)', function() {
    it('should change app mount path', function() {
      expect(app).to.have.property('mountPath', '/');
      app.setMountPath('/my-app');
      expect(app).to.have.property('mountPath', '/my-app');
    });
  });

  describe('getMountPath()', function() {
    it('should return app mount path', function() {
      expect(app.getMountPath()).to.eq(app.mountPath);
    });
  });

  describe('define()', function() {
    let methodName, methodFn, methodSettings, method;

    beforeEach(function() {
      methodName = 'test';
      methodFn = function() {};
      methodSettings = {
        description: 'method description',
        params: [{ name: 'gender', type: 'string' }],
        route: { path: 'test', verb: 'post' }
      };
      method = new Method(methodName, methodSettings, methodFn);
    });

    it('should add app as method parent', function() {
      app.define(method);
      expect(app.methods[0]).to.have.property('parent', app);
    });

    it('should define a new method and added to app', function() {
      expect(app).to.have.deep.property('methods.length', 0);
      app.define(methodName, methodSettings, methodFn);
      expect(app).to.have.deep.property('methods.length', 1);
    });

    it('should add a method instance', function() {
      expect(app).to.have.deep.property('methods.length', 0);
      app.define(method);
      expect(app).to.have.deep.property('methods.length', 1);
    });
  });

  describe('plugin(pluginOrPlugins, options)', function() {
    it('should accept plugin name for internal plugins', function() {
      expect(function() {
        app.plugin('evaluator', {});
      }).to.not.throw(Error);
    });

    it('should invoke one plugin function with options', function() {
      let pluginInvoked = false;
      let plugin = function() {
        pluginInvoked = true;
      };
      app.plugin(plugin, {});
      expect(pluginInvoked).to.be.true;
    });

    it('should invoke multiple plugins with options', function() {
      let pluginInvoked = 0;
      let plugin = function() {
        pluginInvoked++;
      };
      app.plugin([plugin, plugin, plugin], {});
      expect(pluginInvoked).to.equal(3);
    });
  });

  describe('clone()', function() {
    let cloned;

    beforeEach(function() {
      app.parent = app;

      app.define('test', {
        description: 'test description',
        params: [{ name: 'name', type: 'string' }]
      }, function(ctx, next) {
        next();
      });

      app.define('test1', {
        description: 'test1 description',
        params: [{ name: 'name', type: 'string' }]
      }, function(ctx, next) {
        next();
      });

      app.use(app);

      cloned = app.clone();
    });

    [
      'parent',
      'mountPath',
      'settings',
      'beforeHooks',
      'afterHooks',
      'afterErrorHooks',
      'locals',
      'mountedApps',
      'methods'
    ].forEach(function() {

    });

    [
      'parent',
      'mountPath',
      'settings',
      'beforeHooks',
      'afterHooks',
      'afterErrorHooks',
      'locals'
    ].forEach(function(prop) {
      it(`should return a cloned app with same ${prop} value`, function() {
        expect(cloned).to.have.property(prop).to.be.deep.eq(app[prop]);
      });
    });

    [
      'settings',
      'beforeHooks',
      'afterHooks',
      'afterErrorHooks',
      'locals'
    ].forEach(function(prop) {
      it(`should return a cloned app without the same ${prop} reference`, function() {
        expect(cloned).to.have.property(prop).not.to.be.equal(app[prop]);
      });
    });

    it('should have all sub apps mounted', function() {
      expect(cloned.mountedApps).to.have.property('length').eq(app.mountedApps.length);
      cloned.mountedApps.forEach(function(mountedApp, i) {
        let originalMountedApp = app.mountedApps[i];
        expect(mountedApp).not.eq(originalMountedApp);
        expect(mountedApp).to.have.property('parent').eq(cloned);
        expect(mountedApp).to.have.property('name').eq(originalMountedApp.name);
      });
    });

    it('should have all methods added', function() {
      expect(cloned.methods).to.have.property('length').eq(app.methods.length);
      cloned.methods.forEach(function(method, i) {
        let originalMethod = app.methods[i];
        expect(method).not.eq(originalMethod);
        expect(method).to.have.property('parent').eq(cloned);
        expect(method).to.have.property('name').eq(originalMethod.name);
      });
    });
  });

  describe('use(fn, options)', function() {
    it('should be able to use an express or socketio middleware', function() {
      app.use(function() {});
      expect(app.methods.length).to.eq(1);
    });

    it('should be able to use an app', function() {
      let subApp = new Application('sub');
      app.use(subApp);
      expect(app.mountedApps).to.have.a.property('length').to.eq(1);
      expect(app.mountedApps[0]).to.have.a.property('parent').to.eq(app);
    });

    it('should be able to use a controller', function() {
      class UsersCtrl extends Controller {
        constructor() {
          super();

          this.beforeAction('signInRequired', { expect: 'signIn' });
          this.afterAction('insight');
          this.afterErrorAction('recordError');
        }

        initConfig() {
          return { list: {}, signIn: {} };
        }

        signInRequired() {}
        insight() {}
        recordError() {}

        list() {}
        signIn() {}
      }

      app.use(UsersCtrl);

      expect(app.mountedApps).to.have.a.property('length').to.eq(1);

      let subApp = app.mountedApps[0];

      expect(subApp).to.have.a.property('parent').to.eq(app);
      expect(subApp).to.have.a.property('name').to.eq('users');

      let methodsLength = 2;
      let beforeHooksLength = methodsLength + 1;
      let afterHooksLength = 2;
      let afterErrorHooksLength = 2;
      expect(Object.keys(subApp.beforeHooks).length).to.eq(beforeHooksLength);
      expect(Object.keys(subApp.afterHooks).length).to.eq(afterHooksLength);
      expect(Object.keys(subApp.afterErrorHooks).length).to.eq(afterErrorHooksLength);
      expect(subApp.methods.length).eq(methodsLength);
    });

    it('should be able to use a method', function() {
      let method = new Method('test', {}, function() {});
      app.use(method, {});
      expect(app.methods.length).to.eq(1);
    });
  });

  describe('set(setting, val)', function() {
    it('should add a setting with corresponding value', function() {
      app.set('abc', 1);
      app.set('person.gender', 'male');
      expect(app.settings).to.have.a.property('abc', 1);
      expect(app.settings).to.have.a.deep.property('person.gender', 'male');
    });
  });

  describe('get(setting)', function() {
    it('should get a setting with corresponding value', function() {
      app.set('abc', 1);
      app.set('person.gender', 'male');
      expect(app.get('abc')).to.eq(1);
      expect(app.get('person.gender')).to.eq('male');
    });
  });

  describe('enable(setting)', function() {
    it('should enable a setting', function() {
      app.enable('abc');
      expect(app.get('abc')).to.eq(true);
    });
  });

  describe('disable(setting)', function() {
    it('should disable a setting', function() {
      app.disable('abc');
      expect(app.get('abc')).to.eq(false);
    });
  });

  describe('enabled(setting)', function() {
    it('should return whether a setting is enabled', function() {
      app.enable('abc');
      expect(app.enabled('abc')).to.eq(true);
      app.disable('abc');
      expect(app.enabled('abc')).to.eq(false);
    });
  });

  describe('disabled(setting)', function() {
    it('should return whether a setting is disabled', function() {
      app.enable('abc');
      expect(app.disabled('abc')).to.eq(false);
      app.disable('abc');
      expect(app.disabled('abc')).to.eq(true);
    });
  });

  describe('fullName()', function() {
    it('should return expected full name with or without parent object', function() {
      expect(app.fullName()).to.be.eq('test');

      app.parent = {
        fullName: function() {
          return 'users';
        }
      };

      expect(app.fullName()).to.be.eq('users.test');
    });
  });

  describe('fullPath()', function() {
    it('should return expected full path with or without parent object', function() {
      expect(app.fullPath()).to.be.eq('/');

      app.setMountPath('/test');

      app.parent = {
        fullPath: function() {
          return '/users';
        }
      };

      expect(app.fullPath()).to.be.eq('/users/test');
    });
  });
});
