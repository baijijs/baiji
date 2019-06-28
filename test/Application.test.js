'use strict';

const expect = require('chai').expect;
const Application = require('../lib/Application');
const Action = require('../lib/Action');
const Controller = require('../lib/Controller');

const DEFAULT_SETTINGS = { adapter: 'express', env: 'development', 'x-powered-by': true };

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
      ['actions', []],
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

  describe('define()', function() {
    let actionName, actionFn, actionSettings, action;

    beforeEach(function() {
      actionName = 'test';
      actionFn = function() {};
      actionSettings = {
        description: 'action description',
        params: [{ name: 'gender', type: 'string' }],
        route: { path: 'test', verb: 'post' }
      };
      action = new Action(actionName, actionSettings, actionFn);
    });

    it('should add app as action parent', function() {
      app.define(action);
      expect(app.actions[0]).to.have.property('parent', app);
    });

    it('should define a new action and added to app', function() {
      expect(app).to.have.nested.property('actions.length', 0);
      app.define(actionName, actionSettings, actionFn);
      expect(app).to.have.nested.property('actions.length', 1);
    });

    it('should add a action instance', function() {
      expect(app).to.have.nested.property('actions.length', 0);
      app.define(action);
      expect(app).to.have.nested.property('actions.length', 1);
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
      expect(pluginInvoked).to.eq(true);
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
      'actions'
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

    it('should have all actions added', function() {
      expect(cloned.actions).to.have.property('length').eq(app.actions.length);
      cloned.actions.forEach(function(action, i) {
        let originalAction = app.actions[i];
        expect(action).not.eq(originalAction);
        expect(action).to.have.property('parent').eq(cloned);
        expect(action).to.have.property('name').eq(originalAction.name);
      });
    });
  });

  describe('use(fn, options)', function() {
    it('should be able to use an express or socketio middleware', function() {
      app.use(function() {});
      expect(app.actions.length).to.eq(1);
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

      let actionsLength = 2;
      let beforeHooksLength = actionsLength + 1;
      let afterHooksLength = 2;
      let afterErrorHooksLength = 2;
      expect(Object.keys(subApp.beforeHooks).length).to.eq(beforeHooksLength);
      expect(Object.keys(subApp.afterHooks).length).to.eq(afterHooksLength);
      expect(Object.keys(subApp.afterErrorHooks).length).to.eq(afterErrorHooksLength);
      expect(subApp.actions.length).eq(actionsLength);
    });

    it('should be able to use a action', function() {
      let action = new Action('test', {}, function() {});
      app.use(action, {});
      expect(app.actions.length).to.eq(1);
    });
  });

  describe('set(setting, val)', function() {
    it('should add a setting with corresponding value', function() {
      app.set('abc', 1);
      app.set('person.gender', 'male');
      expect(app.settings).to.have.a.property('abc', 1);
      expect(app.settings).to.have.a.nested.property('person.gender', 'male');
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

  describe('fullName', function() {
    it('should return expected full name with or without parent object', function() {
      expect(app.fullName).to.be.eq('test');

      app.parent = {
        fullName: function() {
          return 'users';
        }
      };

      expect(app.fullName).to.be.eq('users.test');
    });
  });

  describe('fullPath', function() {
    it('should return expected full path with or without parent object', function() {
      expect(app.fullPath).to.be.eq('/');

      app.mountPath = '/test';

      app.parent = {
        fullPath: function() {
          return '/users';
        }
      };

      expect(app.fullPath).to.be.eq('/users/test');
    });
  });
});
