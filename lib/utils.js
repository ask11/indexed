var type = require('type');

/**
 * Expose functions.
 */

module.exports = {
  defineGetter: defineGetter,
  assert: assert,
  prefix: prefix,
};

/**
 * Define getter to `obj` with `name` and `val`.
 *
 * @param {Any} obj
 * @param {String} name
 * @param {Any} val
 */

function defineGetter(obj, name, val) {
  Object.defineProperty(obj, name, {
    get: function() {
      return type(val) == 'function' ? val() : val;
    }
  });
}

/**
 * Assert helper with printf %s support.
 *
 * @param {Boolean} val
 * @param {...Any} message with printf formating
 */

function assert(val, message) {
  if (val) return;
  var args = [].slice.call(arguments, 2);
  var i = 0;

  message = message.replace(/%s/g, function() { return args[i++] });
  throw new TypeError(message);
}

/**
 * Get prefixed IndexedDB objects
 *
 * @param {String} name
 * @return {Any}
 */

function prefix(name) {
  switch (name) {
    case 'indexedDB':
      return window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB;
  }
}
