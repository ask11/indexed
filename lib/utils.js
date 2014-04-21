var type = require('type');

/**
 * Expose functions.
 */

module.exports = {
  defineGetter: defineGetter,
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
