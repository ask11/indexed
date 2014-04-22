var Emitter = require('emitter');
var type = require('type');
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
  assert(type == 'read' || type == 'write', 'not valid transaction type %s', type);
  type = type == 'read' ? 'readonly' : 'readwrite';

  var tr = db.origin.transaction([store.name], type);
  var that = this;

  defineGetter(this, 'db', db);
  defineGetter(this, 'origin', tr);
  defineGetter(this, 'store', store);
  defineGetter(this, 'type', type);
  defineGetter(this, 'error', function() { return tr.error });

  tr.onerror = function() { that.emit('error', that.error) };
  tr.oncomplete = function() { that.emit('complete') };
  tr.onabort = function() { that.emit('abort') };
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
 * @return {Transaction}
 */

Transaction.prototype.get = function(key, cb) {
  var objectStore = this.origin.objectStore(this.store.name);
  var req = objectStore.get(key);

  if (cb) {
    request(req, function(err, e) { err ? cb(err) : cb(null, e.target.result) });
    this.once('error', cb);
  }

  return this;
};

/**
 * Put `val` by `key`.
 * If `store.key` specified, `key` can be an object.
 *
 * @param {Any} key
 * @param {Any} [val]
 * @param {Function} [cb]
 * @return {Transaction}
 */

Transaction.prototype.put = function(key, val, cb) {
  if (type(val) == 'function') cb = val;
  var objectStore = this.origin.objectStore(this.store.name);
  var req = objectStore.put(key);

  if (cb) {
    request(req, function(err) { if (err) cb(err) });
    this.once('complete', cb);
    this.once('error', cb);
  }

  return this;
};

/**
 * Del document by `key`.
 *
 * @param {Any} key
 * @param {Function} cb
 * @return {Transaction}
 */

Transaction.prototype.del = function(key, cb) {
  var objectStore = this.origin.objectStore(this.store.name);
  var req = objectStore.delete(key);

  if (cb) {
    request(req, function(err) { if (err) cb(err) });
    this.once('complete', cb);
    this.once('error', cb);
  }

  return this;
};
