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
});
