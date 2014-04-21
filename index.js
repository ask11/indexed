var DB = require('./lib/db');
var Schema = require('./lib/schema');

/**
 * API to create and manage databases.
 */

exports.open = DB; // new DB(name, schema)
exports.schema = Schema; // new Schema()
exports.destroy = DB.destroy;

/**
 * Expose core classes.
 */

exports.DB = DB; // db interface
exports.Schema = Schema; // schema DSL
exports.Transaction; // transactions
exports.Store; // stores
exports.Index; // subclass of Store to manage indexes
