'use strict';

module.exports = function padRight(str, len, ch) {
  str = String(str);

  let i = -1;

  if (!ch && ch !== 0) ch = ' ';

  len = len - str.length;

  while (++i < len) {
    str = str + ch;
  }

  return str;
};
