var Emitter = require('emitter');
var request = require('idb-request');
var type = require('type');
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
  defineGetter(this, 'error', function() { return tr.error });

  tr.addEventListener('error', function() { that.emit('error', that.error) });
  tr.addEventListener('abort', function() { that.emit('abort') });
  tr.addEventListener('complete', function() { that.emit('complete', that) });
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
  var objectStore = this.origin.objectStore(this.store.name);
  var req = objectStore.get(key);

  if (cb) {
    request(req, function(err, res) {
      err ? cb(err) : cb(null, res.target.result);
    });
  }
};

/**
 * Put `val` by `key`.
 * If `store.key` specified, `key` can be an object.
 *
 * @param {Any} key
 * @param {Any} [val]
 * @param {Function} [cb]
 */

Transaction.prototype.put = function(key, val, cb) {
  var objectStore = this.origin.objectStore(this.store.name);
  if (type(val) == 'function') cb = val;

  this.store.key && key[this.store.key]
    ? objectStore.put(key)
    : objectStore.put(val, key);

  if (cb) {
    this.on('error', function(err) { cb(err) });
    this.on('complete', function() { cb() });
  }
};

/**
 * Del document by `key`.
 *
 * @param {Any} key
 * @param {Function} cb
 */

Transaction.prototype.del = function(key, cb) {
  var objectStore = this.origin.objectStore(this.store.name);
  objectStore.delete(key);

  if (cb) {
    this.on('error', function(err) { cb(err) });
    this.on('complete', function() { cb() });
  }
};
