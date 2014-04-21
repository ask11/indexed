var DB = require('./lib/db');

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
  return new DB(name, version, cb);
}

/**
 * Aliases.
 */

exports.open = indexed;
exports.destroy = DB.destroy;

/**
 * Expose core classes.
 */

exports.DB = DB; // db interface
exports.Transaction; // transactions
exports.Store; // stores
exports.Index; // subclass of Store to manage indexes
