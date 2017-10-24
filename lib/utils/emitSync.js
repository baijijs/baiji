'use strict';

// Emit event and execute listeners one by one
module.exports = function emitSync(eventName) {
  const listeners = this.listeners(eventName);
  const context = this;

  if (!listeners.length) return Promise.resolve();

  let index = 0;
  let args = arguments.length === 1 ? [arguments[0]] : Array.apply(null, arguments);
  args.shift();

  function nextListener() {
    let listener = listeners[index];
    if (listener) {
      index++;
      listener.apply(context, args);
      nextListener();
    }
  }

  return nextListener();
};