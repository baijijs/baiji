module.exports = function logError(msg) {
  msg = String(msg || '').valueOf();

  console.log(`\u001b[31mError: ${msg}\u001b[39m`);
};
