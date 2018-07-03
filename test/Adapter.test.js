'use strict';

const expect = require('chai').expect;
const Adapter = require('../lib/Adapter');
const Application = require('../lib/Application');

describe('class Adapter', function() {
  let adapter, app;
  let noop = function(){};

  beforeEach(function() {
    app = new Application('test');
    adapter = new Adapter(app, {});
  });

  describe('constructor(app, options)', function() {
    it('should raise an error if app is not an valid Application instance', function() {
      expect(function() {
        new Adapter;
      }).to.throw(Error).have.property('message', 'app must be an instance of \'Application\'');

      expect(function() {
        new Adapter('app');
      }).to.throw(Error).have.property('message', 'app must be an instance of \'Application\'');
    });

    [
      ['app', function() { return app; }],
      ['options', {}],
      ['actions', []],
      ['sortedActions', []]
    ].forEach(function(prop) {
      it(`should have property '${prop[0]}' and corresponding value`, function() {
        let value = typeof prop[1] === 'function' ? prop[1]() : prop[1];
        expect(adapter).to.have.property(prop[0]).deep.eq(value);
      });
    });
  });

  describe('createActionsBy(wrapper)', function() {
    it('should raise an error if wrapper is not a valid function', function() {
      expect(function() {
        adapter.createActionsBy('abc');
      }).to.throw(Error).have.property('message', 'abc is not a valid wrapper function');
    });

    it('should filter actions by supported adapter', function() {
      app.define('test', {
        adapter: 'express'
      }, function() {});

      app.set('adapter', 'express');
      let actions = adapter.createActionsBy(noop);
      expect(actions).to.have.property('length', 1);
      expect(actions[0]).to.have.property('name', 'test.test');
      expect(actions[0]).to.have.property('description', 'test');
      expect(actions[0]).to.have.property('verb', 'all');
      expect(actions[0]).to.have.property('path', '/');
      expect(actions[0]).to.have.property('handler');

      app.set('adapter', 'socketio');
      expect(adapter.createActionsBy(noop)).to.have.property('length', 0);
    });
  });

  describe('createHandler()', function() {
    it('should raise an error for Not Implement', function() {
      expect(function() {
        adapter.createHandler();
      }).to.throw(Error).have.property('message', 'Not Implement');
    });
  });

  describe('createContext()', function() {
    it('should raise an error if there is no specific context', function() {
      expect(function() {
        adapter.createContext();
      }).to.throw(Error).have.property('message', 'undefined is not a valid Context');
    });
  });

  describe('callback()', function() {
    it('should raise an error for Not Implement', function() {
      expect(function() {
        adapter.callback();
      }).to.throw(Error).have.property('message', 'Not Implement');
    });
  });

  describe('listen()', function() {
    it('should raise an error for Not Implement', function() {
      expect(function() {
        adapter.listen();
      }).to.throw(Error).have.property('message', 'Not Implement');
    });
  });

  describe('debugAllActions(isDebug)', function() {
    it('should return debug messages', function() {
      app.define('test', {
        adapter: 'express'
      }, function() {});
      adapter.actions = adapter.createActionsBy(noop);

      expect(adapter.debugAllActions()).to.deep.eq([
        'All Actions: (1)',
        '=> test.test ALL / test'
      ]);
    });
  });
});
