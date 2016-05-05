'use strict';

const assert = require('assert');

module.exports = installInterfere;

function installInterfere(delegator) {

  if (!delegator.interferes) delegator.interferes = [];
  if (!delegator.interfere) {
    delegator.interfere = function interfere(name, fn) {
      assert(typeof fn == 'function', `${fn} is not a valid function`);
      let proto = delegator.proto;
      let target = delegator.target;

      delegator.interferes.push(name);

      proto[name] = function() {
        fn.apply(this, arguments);
        return delegator[target][name].apply(delegator[target], arguments);
      };

      return delegator;
    };
  }

  return delegator;
}
