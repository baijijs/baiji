module.exports = function escapeRegExp(str) {
  // see http://stackoverflow.com/a/6969486/69868
  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
};
