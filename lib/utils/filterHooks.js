'use strict';

const mm = require('micromatch');

// Filter method specific hooks according to method name
module.exports = function filterHooks(hooks, targetName) {
  if (!hooks) hooks = {};
  let methodNames = Object.keys(hooks);
  let fns = [];
  let i;
  for (i = 0; i < methodNames.length; i++) {
    let methodName = methodNames[i];
    if (mm.isMatch(targetName, methodName)) {
      let matchedHooks = hooks[methodName] || [];
      fns = fns.concat(matchedHooks);
    }
  }

  return fns;
};
