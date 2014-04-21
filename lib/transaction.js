var utils = require('./utils');
var request = require('idb-request');
var defineGetter = utils.defineGetter;
var assert = utils.assert;

/**
 * Expose `Transaction`.
 */

module.exports = Transaction;

/**
 * Initialize new `Transaction`.
 *
 * @param {DB} db
 * @param {Store} store
 * @param {String} type
 */

function Transaction(db, store, type) {
  assert(type != 'read' || type != 'write', 'not valid transaction type %s', type);
  type = type == 'read' ? 'readonly' : 'readwrite';

  var tr = db.origin.transaction([store.name], type);
  defineGetter(this, 'db', db);
  defineGetter(this, 'origin', tr);
  defineGetter(this, 'scope', store.name);
}

/**
 * Abort transaction.
 */

Transaction.prototype.abort = function() {
  this.origin.abort();
};

/**
 * Get document by `key`.
 *
 * @param {Any} key
 * @param {Function} [cb]
 */

Transaction.prototype.get = function(key, cb) {
  var store = this.origin.objectStore(this.scope);
  var req = store.get(key);

  request(req, function(err, res) {
    err ? cb(err) : cb(null, res.target.result);
  });
};
