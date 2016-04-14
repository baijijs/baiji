module.exports = isPromise;

function isPromise(fn) {
  if (fn && typeof fn.then == 'function') return true;
  return false;
}
