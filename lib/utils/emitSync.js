'use strict';

const Promise = require('any-promise');

// Emit event and execute listeners one by one
module.exports = function emitSync(eventName) {
  const listeners = this.listeners(eventName);
  const app = this;

  if (!listeners.length) return Promise.resolve();

  let index = 0;
  let args = arguments.length === 1 ? [arguments[0]] : Array.apply(null, arguments);
  args.shift();

  function execListeners() {
    let listener = listeners[index];
    if (listener) {
      index++;
      return Promise.resolve(listener.apply(app, args)).then(execListeners);
    } else {
      return Promise.resolve();
    }
  }

  return execListeners();
};