'use strict';

// Module dependencies
const Event = require('events');
const path = require('path');

/**
 * Base Class
 */
class Base extends Event {
  constructor() {
    super();

    // Name attr
    this._name = null;

    // desc
    this._description = null;

    // mount path
    this._mountPath = '/';

    // Parent reference
    this._parent = null;

    // Cache attrs
    this._fullName = null;
    this._fullPath = null;
  }

  get name() {
    return this._name;
  }

  set name(str) {
    this._fullName = null;
    this._name = str;
  }

  desc(str) {
    this.description = str;
  }

  get description() {
    return this._description;
  }

  set description(str) {
    this._description = str;
  }

  get mountPath() {
    return this._mountPath;
  }

  set mountPath(p) {
    this._fullPath = null;
    this._mountPath = p || '/';
  }

  get parent() {
    return this._parent;
  }

  set parent(p) {
    // Clear relative caches
    this._fullName = null;
    this._fullPath = null;

    this._parent = p;
  }

  // Full path, including parent's full path
  get fullPath() {
    if (this._fullPath) return this._fullPath;

    let segments = ['/'];
    if (this.parent) segments.push(this.parent.fullPath || '');
    segments.push(this.mountPath);
    this._fullPath = path.posix.join.apply(path, segments);
    return this._fullPath;
  }

  // Full name, including parent's full name
  get fullName() {
    if (this._fullName) return this._fullName;

    let segments = [this.name];
    if (this.parent) segments.unshift(this.parent.fullName);
    this._fullName = segments.join('.');
    return this._fullName;
  }
}

module.exports = Base;
