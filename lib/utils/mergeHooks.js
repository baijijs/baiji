'use strict';

const hookTypes = require('./hookTypes');

module.exports = function mergeHooks(app, subApp) {

  hookTypes.forEach(mergeHooksByType);

  function mergeHooksByType(type) {
    let typeName = `${type}Actions`;

    let prefix = subApp.name;

    let hookNames = Object.keys(subApp[typeName]);
    hookNames.forEach(function(hookName) {
      let hooks = subApp[typeName][hookName];
      hookName = `${prefix}.${hookName}`;

      app[typeName][hookName] = hooks.slice();
    });
  }
};
