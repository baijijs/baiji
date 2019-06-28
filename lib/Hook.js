'use strict';

const _ = require('lodash');
const assert = require('assert');
const mm = require('micromatch');
const addPrefix = require('./utils/addPrefix');

const HOOK_METHODS = {
  before: 'before',
  after: 'after',
  error: 'onError',
  beforeRespond: 'beforeRespond'
};

const SUPPORT_HOOKS = Object.keys(HOOK_METHODS);

/**
 * General Hook class
 */
class Hook {
  constructor(options = {}) {
    const { host, nestedHosts } = options;
    assert(host, 'hook must be intialized with a host');

    this.types = SUPPORT_HOOKS;
    this.hooks = Object.create(null);
    this.host = host;
    this.nestedHosts = nestedHosts || '';

    this.injectHookMethodsIntoHost();
  }

  injectHookMethodsIntoHost() {
    const hook = this;
    const host = this.host;
    _.each(this.types, function(type) {
      // methodName, methodName1, methodName2, fn
      function addHook() {
        let args = arguments.length === 1 ? [arguments[0]] : Array.apply(null, arguments);
        let fn = args.splice(args.length - 1, 1)[0];
        assert('function' == typeof fn, `${fn} must be a function`);

        hook.add(type, args, fn);

        return host;
      }

      // add hook method
      host[HOOK_METHODS[type]] = addHook;
    });
  }

  add(type, patterns, fn) {
    let i = patterns.length;

    // If no hook specified, add wildcard
    if (i === 0) {
      patterns = ['*'];
      i = 1;
    }

    if (!this.hooks[type]) this.hooks[type] = {};

    while (i--) {
      let methodName = patterns[i];
      // for array method names
      if (Array.isArray(methodName)) {
        this.add(type, methodName, fn);
      } else {
        if (!this.hooks[type][methodName]) {
          this.hooks[type][methodName] = [fn];
        } else {
          this.hooks[type][methodName].push(fn);
        }
      }
    }
  }

  searchBy(type) {
    let host = this.host;
    let hostName = host.name || '';

    let hooks = addPrefix(this.hooks[type], hostName);

    _.each(host[this.nestedHosts], nestedHost => {
      _.assign(
        hooks,
        addPrefix(nestedHost.hooks.searchBy(type), hostName)
      );
    });

    return hooks;
  }

  filterBy(type, name) {
    let hooks = this.searchBy(type);

    let patterns = Object.keys(hooks);
    let fns = [];
    let i;
    for (i = 0; i < patterns.length; i++) {
      let pattern = patterns[i];
      if (mm.isMatch(name, pattern)) {
        let matchedHooks = hooks[pattern] || [];
        fns = fns.concat(matchedHooks);
      }
    }

    return fns;
  }

  filter(name) {
    let hooks = {};

    _.each(this.types, type => {
      hooks[type] = this.filterBy(type, name);
    });

    return hooks;
  }

  clone(host, nestedHosts) {
    host = host || this.host;
    nestedHosts = host.nestedHosts || this.nestedHosts;
    let hook = new Hook(host, nestedHosts);
    hook.hooks = _.clone(this.hooks);
    return hook;
  }
}

module.exports = Hook;
