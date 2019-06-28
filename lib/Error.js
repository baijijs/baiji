'use strict';

function BaijiError(msg) {
  Error.call(this);

  if (Error.captureStackTrace) {
    Error.captureStackTrace(this);
  } else {
    this.stack = new Error().stack;
  }

  this.message = msg;
  this.name = 'BaijiError';
}

/*!
 * Inherits from Error.
 */
BaijiError.prototype = Object.create(Error.prototype);
BaijiError.prototype.constructor = Error;
