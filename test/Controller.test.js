'use strict';

const expect = require('chai').expect;
const Controller = require('../lib/Controller');

describe('class Controller', function() {

  let Ctrl;
  let ctrl;

  beforeEach(function() {
    Ctrl = class TestCtrl extends Controller {
      constructor(name, mountPath) {
        super(name, mountPath);
      }
    };

    ctrl = new Ctrl;
  });

  describe('constructor(name, mountPath)', function() {
    it('should extract name and mountPath from controller name', function() {
      expect(ctrl).to.have.property('name', 'test');
      expect(ctrl).to.have.property('mountPath', 'test');

      let ctrl1 = new (class TestController extends Controller {
        constructor() {
          super();
        }
      });

      expect(ctrl1).to.have.property('name', 'test');
      expect(ctrl1).to.have.property('mountPath', 'test');
    });

    it('should set name and mountPath by constructor', function() {
      let ctrl = new Ctrl('my', '/my');
      expect(ctrl).to.have.property('name', 'my');
      expect(ctrl).to.have.property('mountPath', '/my');
    });

    [
      ['basePath', '/'],
      ['parent', null],
      ['__hooksConfig', {}],
      ['__configs', {}]
    ].forEach(function(prop) {
      it(`should have initial properties ${prop[0]} with specific value`, function() {
        expect(ctrl).to.have.property(prop[0]).to.deep.eq(prop[1]);
      });
    });

    Object.getOwnPropertyNames(Controller.prototype).forEach(function(name) {
      it(`should raise an error if internal method '${name}' is overwritten`, function() {
        if (name === 'constructor') return;
        Ctrl.prototype[name] = function() {};
        expect(function() {
          new Ctrl();
        }).to.throw(Error).and.have.property('message', `Method: \`${name}\` is reserved by baiji.Controller, please rename it`);
      });
    });
  });

  describe('setName(name)', function() {
    it('should set correct name', function() {
      expect(ctrl).to.have.property('name', 'test');
      ctrl.setName('abc');
      expect(ctrl).to.have.property('name', 'abc');
    });
  });

  describe('getName()', function() {
    it('should get correct name', function() {
      expect(ctrl.getName()).to.eq('test');
    });
  });

  describe('setBasePath(basePath)', function() {
    it('should set correct basePath', function() {
      expect(ctrl).to.have.property('basePath', '/');
      ctrl.setBasePath('/abc');
      expect(ctrl).to.have.property('basePath', '/abc');
    });
  });

  describe('getBasePath()', function() {
    it('should get correct basePath', function() {
      expect(ctrl.getBasePath()).to.eq('/');
    });
  });

  describe('setMountPath(basePath)', function() {
    it('should set correct mountPath', function() {
      expect(ctrl).to.have.property('mountPath', 'test');
      ctrl.setMountPath('/abc');
      expect(ctrl).to.have.property('mountPath', '/abc');
    });
  });

  describe('getMountPath()', function() {
    it('should get correct mountPath', function() {
      expect(ctrl.getMountPath()).to.eq('/test');
    });
  });

  describe('configure(nameOrConfigs, methodConfig)', function() {
    it('should be able to config via object', function() {
      ctrl.configure({ abc: 1 });
      expect(ctrl.__configs).to.have.property('abc', 1);
    });

    it('should be able to config via name and object', function() {
      ctrl.configure('name', { abc: 1 });
      expect(ctrl.__configs).to.have.property('name').deep.eq({ abc: 1 });
    });
  });

  // Hooks tests
  [
    'before',
    'after',
    'afterError'
  ].forEach(function(hookName) {
    describe(`${hookName}Action(nameOrFn, options)`, function() {
      it('should raise an error if there is no action method can be found', function() {
        expect(function() {
          ctrl[`${hookName}Action`]('non_existed_method');
        }).to.throw(Error).to.have.property('message', 'No method named \'non_existed_method\' defined');
      });

      it(`should set ${hookName} actions`, function() {
        ctrl.filterUser = function() {};
        ctrl[`${hookName}Action`]('filterUser');
        expect(ctrl.__hooksConfig).to.have.deep.property(`${hookName}.filterUser`).deep.eq({
          fn: ctrl.filterUser,
          options: {
            except: [],
            only: ['*']
          }
        });
      });

      it('should add proper filters by `except` option', function() {
        ctrl.filterUser = function() {};
        ctrl[`${hookName}Action`]('filterUser', { except: 'index' });

        expect(ctrl.__hooksConfig).to.have.deep.property(`${hookName}.filterUser`).deep.eq({
          fn: ctrl.filterUser,
          options: {
            except: ['index'],
            only: ['*']
          }
        });

        ctrl.__hooksConfig = {};

        ctrl[`${hookName}Action`]('filterUser', { except: '*' });

        expect(ctrl.__hooksConfig).to.have.deep.property(`${hookName}.filterUser`).deep.eq({
          fn: ctrl.filterUser,
          options: {
            except: ['*'],
            only: []
          }
        });

        ctrl.__hooksConfig = {};

        ctrl[`${hookName}Action`]('filterUser', { except: ['index', 'show'] });

        expect(ctrl.__hooksConfig).to.have.deep.property(`${hookName}.filterUser`).deep.eq({
          fn: ctrl.filterUser,
          options: {
            except: ['index', 'show'],
            only: ['*']
          }
        });
      });

      it('should add proper filters by `only` option', function() {
        ctrl.filterUser = function() {};
        ctrl[`${hookName}Action`]('filterUser', { only: 'index' });

        expect(ctrl.__hooksConfig).to.have.deep.property(`${hookName}.filterUser`).deep.eq({
          fn: ctrl.filterUser,
          options: {
            except: [],
            only: ['index']
          }
        });

        ctrl.__hooksConfig = {};

        ctrl[`${hookName}Action`]('filterUser', { only: '*' });

        expect(ctrl.__hooksConfig).to.have.deep.property(`${hookName}.filterUser`).deep.eq({
          fn: ctrl.filterUser,
          options: {
            except: [],
            only: ['*']
          }
        });

        ctrl.__hooksConfig = {};

        ctrl[`${hookName}Action`]('filterUser', { only: ['index', 'show'] });

        expect(ctrl.__hooksConfig).to.have.deep.property(`${hookName}.filterUser`).deep.eq({
          fn: ctrl.filterUser,
          options: {
            except: [],
            only: ['index', 'show']
          }
        });
      });
    });

  });

  // Test skip hook methods
  [
    'before',
    'after',
    'afterError'
  ].forEach(function(hookName) {
    let HookName = hookName.replace(/^[a-z]/, function(r) { return r.toUpperCase(); });

    describe(`skip${HookName}Action(nameOrFn, options)`, function() {
      beforeEach(function() {
        ctrl.filterUser = function() {};
        ctrl[`${hookName}Action`]('filterUser');
      });

      it('should raise an error if there is no action method can be found', function() {
        expect(function() {
          ctrl[`skip${HookName}Action`]('non_existed_method');
        }).to.throw(Error).to.have.property('message', 'No method named \'non_existed_method\' defined');
      });

      it(`should skip ${hookName} actions`, function() {
        ctrl[`skip${HookName}Action`]('filterUser');
        expect(ctrl.__hooksConfig).to.have.deep.property(`${hookName}.filterUser.options`).deep.eq({
          except: ['*'],
          only: []
        });
      });

      it('should skip filters by `except` option', function() {
        ctrl[`skip${HookName}Action`]('filterUser', { except: 'index' });

        expect(ctrl.__hooksConfig).to.have.deep.property(`${hookName}.filterUser.options`).deep.eq({
          only: ['index'],
          except: []
        });

        ctrl.__hooksConfig = {};
        ctrl[`${hookName}Action`]('filterUser');
        ctrl[`skip${HookName}Action`]('filterUser', { except: '*' });
        expect(ctrl.__hooksConfig).to.have.deep.property(`${hookName}.filterUser.options`).deep.eq({
          only: ['*'],
          except: []
        });

        ctrl.__hooksConfig = {};
        ctrl[`${hookName}Action`]('filterUser');
        ctrl[`skip${HookName}Action`]('filterUser', { except: ['index', 'show'] });
        expect(ctrl.__hooksConfig).to.have.deep.property(`${hookName}.filterUser.options`).deep.eq({
          only: ['index', 'show'],
          except: []
        });

        ctrl.__hooksConfig = {};
        ctrl[`${hookName}Action`]('filterUser', { only: 'index' });
        ctrl[`skip${HookName}Action`]('filterUser', { except: ['show'] });
        expect(ctrl.__hooksConfig).to.have.deep.property(`${hookName}.filterUser.options`).deep.eq({
          only: ['show'],
          except: []
        });

        ctrl.__hooksConfig = {};
        ctrl[`${hookName}Action`]('filterUser', { only: 'index' });
        ctrl[`skip${HookName}Action`]('filterUser', { except: ['index'] });
        expect(ctrl.__hooksConfig).to.have.deep.property(`${hookName}.filterUser.options`).deep.eq({
          only: ['index'],
          except: []
        });
      });

      it('should skip filters by `only` option', function() {
        ctrl.filterUser = function() {};
        ctrl[`skip${HookName}Action`]('filterUser', { only: 'index' });

        expect(ctrl.__hooksConfig).to.have.deep.property(`${hookName}.filterUser.options`).deep.eq({
          only: ['*'],
          except: ['index']
        });

        ctrl.__hooksConfig = {};
        ctrl[`${hookName}Action`]('filterUser');
        ctrl[`skip${HookName}Action`]('filterUser', { only: '*' });
        expect(ctrl.__hooksConfig).to.have.deep.property(`${hookName}.filterUser.options`).deep.eq({
          only: [],
          except: ['*']
        });

        ctrl.__hooksConfig = {};
        ctrl[`${hookName}Action`]('filterUser');
        ctrl[`skip${HookName}Action`]('filterUser', { only: ['index', 'show'] });
        expect(ctrl.__hooksConfig).to.have.deep.property(`${hookName}.filterUser.options`).deep.eq({
          only: ['*'],
          except: ['index', 'show']
        });

        ctrl.__hooksConfig = {};
        ctrl[`${hookName}Action`]('filterUser', { only: 'index' });
        ctrl[`skip${HookName}Action`]('filterUser', { only: ['show'] });
        expect(ctrl.__hooksConfig).to.have.deep.property(`${hookName}.filterUser.options`).deep.eq({
          only: ['index'],
          except: ['show']
        });

        ctrl.__hooksConfig = {};
        ctrl[`${hookName}Action`]('filterUser', { only: 'index' });
        ctrl[`skip${HookName}Action`]('filterUser', { only: ['index'] });
        expect(ctrl.__hooksConfig).to.have.deep.property(`${hookName}.filterUser.options`).deep.eq({
          only: [],
          except: ['index']
        });

        ctrl.__hooksConfig = {};
        ctrl[`${hookName}Action`]('filterUser', { only: 'index', except: 'show' });
        ctrl[`skip${HookName}Action`]('filterUser', { only: ['index'] });
        expect(ctrl.__hooksConfig).to.have.deep.property(`${hookName}.filterUser.options`).deep.eq({
          only: [],
          except: ['show', 'index']
        });
      });
    });
  });
});
