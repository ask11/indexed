var type = require('type');

/**
 * Expose `stringify` and `parse`.
 */

exports.stringify = stringify;
exports.parse = parse;

/**
 * Helper to convert key of supported type to string.
 * It uses '$' to separate real strings from another valid json values.
 * Indexed uses only simple, comparable types for keys, like:
 * string, number, boolean and null.
 *
 * @param {String} key
 */

function stringify(key) {
  switch (type(key)) {
    case 'string': return '$' + key;
    case 'number':
    case 'boolean':
    case 'null': return JSON.stringify(key);
    default: throw new TypeError('not valid key type');
  }
}

/**
 * Mirror for `stringifyKey`.
 * Converts string key back to comparable value.
 *
 * @param {String} key
 */

function parse(key) {
  return key.charAt(0) == '$' ? key.substr(1) : JSON.parse(key);
}
