'use strict';

const expect = require('chai').expect;
const Action = require('../lib/Action');

describe('class Action', function() {
  let action;

  beforeEach(function() {
    action = new Action('test', {}, function() {});
  });

  describe('constructor(name, options, handler)', function() {
    [
      ['name', 'test'],
      ['stack', null],
      ['adapters', ['express', 'socketio', 'rpc']],
      ['skipHooks', false],
      ['parent', null],
      ['params', []],
      ['description', 'test'],
      ['notes', undefined],
      ['documented', true],
      ['route', { path: '/', verb: 'all' }],
      ['upload', false],
      ['extra', {}],
      ['options', {}]
    ].forEach(function(prop) {
      it(`should have property '${prop[0]}' and corresponding value`, function() {
        expect(action).to.have.property(prop[0]).deep.eq(prop[1]);
      });
    });

    it('should be a valid instance of Action class', function() {
      expect(action).to.be.an.instanceof(Action);
    });

    it('should raise error when params missing `name` property', function() {
      expect(function() {
        new Action('test', { params: [{ type: 'any' }] }, function() {});
      }).to.throw(Error).have.property('message', '`name` is missing for params of `test` action at position [0]');
    });

    it('should raise error when params missing inner params\' deep `name` property', function() {
      expect(function() {
        new Action('test', { params: [{ name: 'profile', type: 'any', params: { type: 'string' } }] }, function() {});
      }).to.throw(Error).have.property('message', '`name` is missing for params of `test` action at position [0].params[0]');
    });

    it('should raise an error if there is no function to be executed', function() {
      expect(function() {
        new Action('test', { params: [{ type: 'any' }] });
      }).to.throw(Error).have.property('message', 'Action handler must be a valid function');
    });

    it('should raise an error if there is no function to be executed', function() {
      expect(function() {
        new Action(null, { params: [{ type: 'any' }] }, function() {});
      }).to.throw(Error).have.property('message', 'Action name must be a valid string');
    });

    it('should parse options.skipHooks by conditions', function() {
      let action = new Action('test', { route: { verb: 'use' } }, function() {});
      expect(action).to.have.property('skipHooks', true);

      let action1 = new Action('test', { route: { verb: 'get' } }, function() {});
      expect(action1).to.have.property('skipHooks', false);

      let action2 = new Action('test', { skipHooks: true }, function() {});
      expect(action2).to.have.property('skipHooks', true);

      let action3 = new Action('test', { skipHooks: '' }, function() {});
      expect(action3).to.have.property('skipHooks', false);
    });
  });

  describe('prototype', function() {
    describe('isSupport(adapterName)', function() {
      it('should return false if invalid adapter name passed', function() {
        expect(action.isSupport('abc')).to.eq(false);
      });

      [
        'express',
        'rpc',
        'socketio'
      ].forEach(function(adapterName) {
        it(`should return true if '${adapterName}' passed`, function() {
          expect(action.isSupport(adapterName)).to.eq(true);
        });
      });
    });

    describe('fullPath', function() {
      it('should return expected full path with or without parent object', function() {
        expect(action.fullPath).to.be.eq('/');

        action.parent = {
          fullPath: function() {
            return '/users';
          }
        };

        action.route.path = '/profile';

        expect(action.fullPath).to.be.eq('/users/profile');
      });
    });

    describe('clone()', function() {
      it('should clone as a new action with all same properties', function() {
        let action = new Action('clone', {
          description: 'clone action test',
          params: [{ name: 'user' }],
          route: { path: '/clone' }
        }, function(next) {
          next();
        });

        let actionCloned = action.clone();

        expect(actionCloned).to.not.eq(action);

        [
          'name',
          'stack',
          'adapters',
          'skipHooks',
          'parent',
          'params',
          'description',
          'notes',
          'documented',
          'route',
          'upload',
          'extra',
          'options'
        ].forEach(function(key) {
          expect(actionCloned).to.have.property(key).to.deep.eq(action[key]);
        });
      });
    });

    describe('fullName', function() {
      it('should return expected full name with or without parent object', function() {
        expect(action.fullName).to.be.eq('test');

        action.parent = {
          fullName: function() {
            return 'users';
          }
        };

        action.route.path = '/profile';

        expect(action.fullName).to.be.eq('users.test');
      });
    });

    describe('invoke() && compose(hooks = {})', function() {
      it('should raise an error if action is not composed', function() {
        expect(function() {
          action.invoke();
        }).to.throw(Error).to.have.property('message', 'Action: \'test\' must be composed before invoking');
      });

      it('should invoke composed function stack by predefined order without error', function(cb) {
        let array = [];
        let beforeStack = [
          function(context, next) { array.push(1); next(); },
          function(context, next) { array.push(2); next(); }
        ];

        action.handler = function(context, next) { array.push(3); next(); };

        let afterStack = [
          function(context, next) { array.push(4); next(); },
          function(context, next) { array.push(5); next(); }
        ];

        let errorStack = [
          function(context, next) { array.push(6); next(); },
        ];

        action.compose({
          before: beforeStack,
          after: afterStack,
          error: errorStack
        });

        action.invoke().then(function() {
          expect(array).to.deep.eq([1, 2, 3, 4, 5]);
        }).then(cb, cb);
      });

      it('should invoke composed function stack by predefined order with error', function(cb) {
        let array = [];
        let beforeStack = [
          function(context, next) { array.push(1); next(); },
          function(context, next) { array.push(2); next(); }
        ];

        action.handler = function() { array.push(3); throw new Error('test'); };

        let afterStack = [
          function(context, next) { array.push(4); next(); },
          function(context, next) { array.push(5); next(); }
        ];

        let errorStack = [
          function(context, next) { array.push(6); next(); }
        ];

        action.compose({
          before: beforeStack,
          after: afterStack,
          error: errorStack
        });

        action.invoke().then(function() {
          expect(array).to.deep.eq([1, 2, 3, 6]);
        }).then(cb, cb);
      });
    });
  });
});
