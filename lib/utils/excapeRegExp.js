module.exports = function excapeRegExp(str) {
  // see http://stackoverflow.com/a/6969486/69868
  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
};
