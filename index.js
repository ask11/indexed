var DB = require('./lib/db');
var Store = require('./lib/store');
var Schema = require('./lib/schema');
var Transaction = require('./lib/transaction');

/**
 * Expose `DB`.
 */

module.exports = exports = DB;

/**
 * Aliases.
 */

exports.open = DB;
exports.schema = Schema;

/**
 * Expose core classes.
 */

exports.DB = DB;
exports.Schema = Schema;
exports.Store = Store;
exports.Transaction = Transaction;
exports.Index;
