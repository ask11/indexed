var DB = require('./lib/db');
var Store = require('./lib/store');
var type = require('type');

/**
 * Expose `indexed()`.
 */

module.exports = exports = indexed;

/**
 * Create new `DB` with `name`.
 *
 * @param {String} name
 * @param {Number} [version]
 * @param {Function} [cb]
 * @return {DB}
 */

function indexed(name, version, cb) {
  if (type(version) == 'function') {
    cb = version;
    version = 1;
  }

  return new DB(name, version, cb);
}

/**
 * Aliases.
 */

exports.open = indexed;

/**
 * Expose core classes.
 */

exports.DB = DB; // db interface
exports.Store = Store; // stores
exports.Transaction; // transactions
exports.Index; // subclass of Store to manage indexes
