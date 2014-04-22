var DB = require('./lib/db');
var Store = require('./lib/store');
var Transaction = require('./lib/transaction');

/**
 * Expose `DB`.
 */

module.exports = exports = DB;

/**
 * Aliases.
 */

exports.open = DB;
exports.DB = DB;
exports.Store = Store;
exports.Transaction = Transaction;
exports.Index;
