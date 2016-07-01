'use strict';

module.exports = addHookByType;

function addHookByType(ctx, type, methods, fn) {
  let i = methods.length;

  let key = `${type}Hooks`;

  if (!ctx[key]) ctx[key] = {};

  while (i--) {
    let hookName = methods[i];
    // for array methods
    if (Array.isArray(hookName)) {
      addHookByType(ctx, type, hookName, fn);
    } else {
      if (!ctx[key][hookName]) {
        ctx[key][hookName] = [fn];
      } else {
        ctx[key][hookName].push(fn);
      }
    }
  }
}
