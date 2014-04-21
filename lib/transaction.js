var Emitter = require('emitter');
var request = require('idb-request');
var utils = require('./utils');
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
  var that = this;

  defineGetter(this, 'db', db);
  defineGetter(this, 'origin', tr);
  defineGetter(this, 'scope', store.name);
  defineGetter(this, 'error', function() { return tr.error });

  tr.addEventListener('error', function() {
    that.emit('error', that.error);
  });

  tr.addEventListener('abort', function() {
    that.emit('abort');
  });

  tr.addEventListener('complete', function() {
    that.emit('complete', that);
  });
}

/**
 * Mix `Emitter`.
 */

Emitter(Transaction.prototype);

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
