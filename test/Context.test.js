'use strict';

const expect = require('chai').expect;
const Context = require('../lib/Context');
const Method = require('../lib/Method');

describe('class Context', function() {
  let context, method;
  let noop = function() {};

  beforeEach(function() {
    method = new Method('test', {
      params: [
        { name: 'username', type: 'string' },
        { name: 'age', type: 'number' },
        { name: 'randomDate', type: 'date' }
      ]
    }, noop);
    context = new Context({}, {}, method, {});
  });

  describe('constructor(req, res, method, options)', function() {
    it('should raise an error if req is invalid', function() {
      expect(function() {
        new Context();
      }).to.throw(Error).have.property('message', 'req is invalid');
    });

    it('should raise an error if res is invalid', function() {
      expect(function() {
        new Context({});
      }).to.throw(Error).have.property('message', 'res is invalid');
    });

    it('should raise an error if method is invalid', function() {
      expect(function() {
        new Context({}, {});
      }).to.throw(Error).have.property('message', 'method must be an instance of Method');
    });

    [
      ['request', function() { return { context }; }],
      ['req', function() { return { context }; }],
      ['response', function() { return { context }; }],
      ['res', function() { return { context }; }],
      ['options', {}],
      ['_method', function() { return method; }],
      ['methodName', 'test'],
      ['fullPath', '/'],
      ['argsBuilt', false],
      ['args', {}],
      ['_done', false],
      ['state', {}]
    ].forEach(function(prop) {
      it(`should have property '${prop[0]}' and corresponding value`, function() {
        let value = typeof prop[1] === 'function' ? prop[1]() : prop[1];
        expect(context).to.have.property(prop[0]).deep.eq(value);
      });
    });

    it('should parse arrayItemDelimiters options as regexp', function() {
      let context = new Context({}, {}, method, { arrayItemDelimiters: [',', ' '] });
      expect(context).to.have.nested.property('options.arrayItemDelimiters').to.match(/,| /g);
    });
  });

  describe('buildArgs()', function() {
    it('should build args by method params config', function() {
      let date = new Date('1998-01-01');
      context.args = { name: 'Felix', username: 'lyfeyaj', age: 27, randomDate: date };
      expect(context.buildArgs()).to.deep.eq({ username: 'lyfeyaj', age: 27, randomDate: date });
    });

    it('should convert args to specific type', function() {
      context.args = { name: 'Felix', username: 'lyfeyaj', age: '27', randomDate: '1998-01-01' };
      expect(context.buildArgs()).to.deep.eq({ username: 'lyfeyaj', age: 27, randomDate: new Date('1998-01-01') });
    });

    it('should build and convert inner params', function() {
      let method = new Method('test', {
        params: [
          { name: 'username', type: 'string' },
          { name: 'age', type: 'number' },
          { name: 'randomDate', type: 'date' },
          {
            name: 'profile',
            type: 'object',
            params: [
              { name: 'gender', type: 'number' },
              { name: 'hobbies', type: ['string'] },
              { name: 'tags', type: ['string'] }
            ]
          }
        ]
      }, noop);
      let context = new Context({}, {}, method, { arrayItemDelimiters: ',' });
      context.args = {
        name: 'Felix',
        username: 'lyfeyaj',
        age: '27',
        randomDate: '1998-01-01',
        profile: {
          gender: '0',
          hobbies: 'pingpong',
          tags: 'programmer,writer'
        }
      };
      expect(context.buildArgs()).to.deep.eq(
        {
          username: 'lyfeyaj',
          age: 27,
          randomDate: new Date('1998-01-01'),
          profile: {
            gender: 0,
            hobbies: ['pingpong'],
            tags: ['programmer', 'writer']
          }
        }
      );
    });

    it('should split string into array by options.arrayItemDelimiters', function() {
      let method = new Method('test', {
        params: [
          { name: 'hobbies', type: ['string'] }
        ]
      }, noop);
      let context = new Context({}, {}, method, { arrayItemDelimiters: ',' });
      context.args = { hobbies: 'pingpong,table tennis,swimming,badminton' };
      expect(context.buildArgs()).to.deep.eq({ hobbies: ['pingpong', 'table tennis', 'swimming', 'badminton'] });
    });
  });

  describe('param(name)', function() {
    it('should return param by name', function() {
      context.args = { name: 'Felix' };
      expect(context.param('name')).eq('Felix');
    });

    it('should support deep key query', function() {
      context.args = { profile: { name: 'Felix' } };
      expect(context.param('profile.name')).eq('Felix');
    });
  });

  describe('throw()', function() {
    it('should throw error on http status code', function() {
      expect(function() {
        context.throw(404);
      }).to.throw(Error).have.property('message', 'Not Found');
    });
  });

  describe('isFinished()', function() {
    it('should throw error for not implement', function() {
      expect(function() {
        context.isFinished();
      }).to.throw(Error).have.property('message', 'Not Implement');
    });
  });

  describe('done()', function() {
    it('should throw error for not implement', function() {
      expect(function() {
        context.done();
      }).to.throw(Error).have.property('message', 'Not Implement');
    });
  });
});
