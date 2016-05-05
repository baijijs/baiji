'use strict';

const minimatch = require('minimatch');

module.exports = function filterHooks(prefix, hooks, name) {
  if (!hooks) hooks = {};
  let hookNames = Object.keys(hooks);
  let fns = [];
  let i;

  for (i = 0; i < hookNames.length; i++) {
    let hookName = `prefix.${hookNames[i]}`;

    if (minimatch(name, hookName)) {
      let matchedHooks = hooks[hookName] || [];
      fns.concat(matchedHooks);
    }
  }

  return fns;
};
