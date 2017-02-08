'use strict';

const expect = require('chai').expect;
const Method = require('../lib/Method');

describe('class Method', function() {
  let method;

  beforeEach(function() {
    method = new Method('test', {}, function() {});
  });

  describe('constructor(name, options, fn)', function() {
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
      ['upload', {}],
      ['extra', {}],
      ['options', {}]
    ].forEach(function(prop) {
      it(`should have property '${prop[0]}' and corresponding value`, function() {
        expect(method).to.have.property(prop[0]).deep.eq(prop[1]);
      });
    });

    it('should be a valid instance of Method class', function() {
      expect(method).to.be.an.instanceof(Method);
    });

    it('should raise error when params missing `name` property', function() {
      expect(function() {
        new Method('test', { params: [{ type: 'any' }] }, function() {});
      }).to.throw(Error).have.property('message', '`name` is missing for params of `test` method at position 0');
    });

    it('should raise an error if there is no function to be executed', function() {
      expect(function() {
        new Method('test', { params: [{ type: 'any' }] });
      }).to.throw(Error).have.property('message', 'Method fn must be a valid function');
    });

    it('should raise an error if there is no function to be executed', function() {
      expect(function() {
        new Method(null, { params: [{ type: 'any' }] }, function() {});
      }).to.throw(Error).have.property('message', 'Method name must be a valid string');
    });

    it('should parse options.skipHooks by conditions', function() {
      let method = new Method('test', { route: { verb: 'use' } }, function() {});
      expect(method).to.have.property('skipHooks', true);

      let method1 = new Method('test', { route: { verb: 'get' } }, function() {});
      expect(method1).to.have.property('skipHooks', false);

      let method2 = new Method('test', { skipHooks: true }, function() {});
      expect(method2).to.have.property('skipHooks', true);

      let method3 = new Method('test', { skipHooks: '' }, function() {});
      expect(method3).to.have.property('skipHooks', false);
    });
  });

  describe('prototype', function() {
    describe('isSupport(adapterName)', function() {
      it('should return false if invalid adapter name passed', function() {
        expect(method.isSupport('abc')).to.be.false;
      });

      [
        'express',
        'rpc',
        'socketio'
      ].forEach(function(adapterName) {
        it(`should return true if '${adapterName}' passed`, function() {
          expect(method.isSupport(adapterName)).to.be.true;
        });
      });
    });

    describe('fullPath()', function() {
      it('should return expected full path with or without parent object', function() {
        expect(method.fullPath()).to.be.eq('/');

        method.parent = {
          fullPath: function() {
            return '/users';
          }
        };

        method.route.path = '/profile';

        expect(method.fullPath()).to.be.eq('/users/profile');
      });
    });

    describe('clone()', function() {
      it('should clone as a new method with all same properties', function() {
        let method = new Method('clone', {
          description: 'clone method test',
          params: [{ name: 'user' }],
          route: { path: '/clone' }
        }, function(next) {
          next();
        });

        let methodCloned = method.clone();

        expect(methodCloned).to.not.eq(method);

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
          expect(methodCloned).to.have.property(key).to.deep.eq(method[key]);
        });
      });
    });

    describe('fullName()', function() {
      it('should return expected full name with or without parent object', function() {
        expect(method.fullName()).to.be.eq('test');

        method.parent = {
          fullName: function() {
            return 'users';
          }
        };

        method.route.path = '/profile';

        expect(method.fullName()).to.be.eq('users.test');
      });
    });

    describe('invoke() && compose(beforeStack, afterStack, errorStack)', function() {
      it('should raise an error if method is not composed', function() {
        expect(function() {
          method.invoke();
        }).to.throw(Error).to.have.property('message', 'Method: \'test\' must be composed before invoking');
      });

      it('should invoke composed function stack by predefined order without error', function(cb) {
        let array = [];
        let beforeStack = [
          function(context, next) { array.push(1); next(); },
          function(context, next) { array.push(2); next(); }
        ];

        method.fn = function(context, next) { array.push(3); next(); };

        let afterStack = [
          function(context, next) { array.push(4); next(); },
          function(context, next) { array.push(5); next(); }
        ];

        let errorStack = [
          function(context, next) { array.push(6); next(); },
        ];

        method.compose(beforeStack, afterStack, errorStack);

        method.invoke().then(function() {
          expect(array).to.deep.eq([1, 2, 3, 4, 5]);
        }).then(cb, cb);
      });

      it('should invoke composed function stack by predefined order with error', function(cb) {
        let array = [];
        let beforeStack = [
          function(context, next) { array.push(1); next(); },
          function(context, next) { array.push(2); next(); }
        ];

        method.fn = function() { array.push(3); throw new Error('test'); };

        let afterStack = [
          function(context, next) { array.push(4); next(); },
          function(context, next) { array.push(5); next(); }
        ];

        let errorStack = [
          function(context, next) { array.push(6); next(); }
        ];

        method.compose(beforeStack, afterStack, errorStack);

        method.invoke().then(function() {
          expect(array).to.deep.eq([1, 2, 3, 6]);
        }).then(cb, cb);
      });
    });
  });
});
