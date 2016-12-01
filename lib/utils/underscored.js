'use strict';

module.exports = function underscored(_s) {
  _s = _s || '';
  _s.trim()
    .replace(/([a-z\d])([A-Z]+)/g, '$1_$2')
    .replace(/[-\s]+/g, '_')
    .toLowerCase();
};
