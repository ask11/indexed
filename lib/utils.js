var type = require('type');

/**
 * Expose functions.
 */

module.exports = {
  defineGetter: defineGetter,
  assert: assert,
  prefix: prefix,
  listen: listen,
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
 * Assert helper with printf message support.
 *
 * @param {Boolean} val
 * @param {...Any} message with printf formating
 */

function assert(val, message) {
  if (!val) throw new TypeError(message);
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

/**
 * Listen `obj` and call `cb`.
 *
 * @param {Object} obj
 * @param {Function} cb
 * @param {Array} [success], default: ['success']
 * @param {Array} [error], default: ['error']
 */

function listen(obj, cb, success, error) {
  if (type(cb) != 'function') return;
  if (type(success) != 'array') success = ['success'];
  if (type(error) != 'array') error = ['error'];

  error.forEach(function(e) { obj.once(e, cb) });
  success.forEach(function(e) { obj.once(e, function(res) { cb(null, res) }) });
}
