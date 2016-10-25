'use strict';

module.exports = addHookByType;

// Add hook by method names, nested method names will be flattened
function addHookByType(ctx, type, methodNames, fn) {
  let i = methodNames.length;

  // If no hook specified, add wildcard
  if (i === 0) {
    methodNames = ['*'];
    i = 1;
  }

  let hookType = `${type}Hooks`;

  if (!ctx[hookType]) ctx[hookType] = {};

  while (i--) {
    let methodName = methodNames[i];
    // for array method names
    if (Array.isArray(methodName)) {
      addHookByType(ctx, type, methodName, fn);
    } else {
      if (!ctx[hookType][methodName]) {
        ctx[hookType][methodName] = [fn];
      } else {
        ctx[hookType][methodName].push(fn);
      }
    }
  }
}
