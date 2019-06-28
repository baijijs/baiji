'use strict';

const expect = require('chai').expect;
const sortRoute = require('../../lib/utils/sortRoute');
sortRoute.logError = require('./loggerError');

describe('SortRoute Rule', function() {

  let r1 = {};
  let r2 = {};

  beforeEach(function() {
    r1 = {
      name: 'index',
      verb: 'get',
      path: '/',
    };
    r2 = {};
  });

  it('should throw name duplicate Error', function() {
    r2 = {
      name: 'index',
      verb: 'get',
      path: '/',
    };
    expect(function () {
      sortRoute(r1, r2);
    }).to.throw(Error).have.property('message', `Conflict method '${r1.name}' detected`);
  });

  ['get', 'post,get', 'get,pust'].forEach(verb1 => {
    r1.verb = verb1;
    ['get', 'get,post', 'put,get'].forEach(verb2 => {
      it('should throw Conflict route path Error', function() {
        r2 = {
          name: 'index2',
          path: '/',
        };

        expect(function () {
          r2.verb = verb2;
          sortRoute(r1, r2);
        }).to.throw(Error).have.property('message', `Conflict route path and verb detected for method '${r2.name}' and method '${r1.name}'`);
      });
    });
  });
});
