module.exports = toJSON;

function toJSON(input) {
  if (!input) {
    return input;
  }
  if (typeof input.toJSON === 'function') {
    return input.toJSON();
  } else if (Array.isArray(input)) {
    return input.map(input, toJSON);
  } else {
    return input;
  }
}
