'use strict';

module.exports = function addHookByType(ctx, type, methods, fn) {
  let i = methods.length;

  let key = `${type}Hooks`;

  if (!ctx[key]) ctx[key] = {};

  while (i--) {
    let hookName = methods[i];
    if (!ctx[key][hookName]) {
      ctx[key][hookName] = [fn];
    } else {
      ctx[key][hookName].push(fn);
    }
  }
};
