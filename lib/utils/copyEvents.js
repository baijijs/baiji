'use strict';

const _ = require('lodash');

// Copy events from one obj to another obj
module.exports = function copyEvents(from, to) {
  // Clone all events
  _.each(from._events, function(events, eventName) {
    events = Array.isArray(events) ? events : [events];
    _.each(events, function(event) {
      to.on(eventName, event);
    });
  });
};