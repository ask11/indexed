var request = require('idb-request');
var utils = require('./utils');
var defineGetter = utils.defineGetter;

/**
 * Expose `Store`.
 */

module.exports = Store;

/**
 * Initialize new `Store` with `ops`.
 *
 * @param {String} name
 * @param {DB} db
 * @param {Object} ops
 */

function Store(name, db, ops) {
  defineGetter(this, 'name', name);
  defineGetter(this, 'db', db);
  defineGetter(this, 'key', ops.key);
  defineGetter(this, 'increment', ops.increment);
}

/**
 * Get document by `key`.
 *
 * @param {Any} key
 * @param {Function} [cb]
 * @return {Transaction}
 */

Store.prototype.get = function(key, cb) {
  return this.db.read(this).get(key, cb);
};

/**
 * Del document by `key`.
 *
 * @param {Any} key
 * @param {Function} [cb]
 * @return {Transaction}
 */

Store.prototype.del = function(key, cb) {
  return this.db.write(this).del(key, cb);
};

/**
 * Put `val` by `key`.
 *
 * @param {Any} key
 * @param {Any} val
 * @param {Function} [cb]
 * @return {Transaction}
 */

Store.prototype.put = function(key, val, cb) {
  return this.db.write(this).put(key, val, cb);
};

/**
 * Count.
 *
 * @param {Function} [cb]
 * @return {Transaction}
 */

Store.prototype.count = function(cb) {
  var tr = this.db.read(this);
  var objectStore = tr.origin.objectStore(this.name);
  var req = objectStore.count();

  if (cb) {
    request(req, function(err, e) { err ? cb(err) : cb(null, e.target.result) });
    tr.once('error', cb);
  }

  return tr;
};

/**
 * Clear store.
 *
 * @param {Function} [cb]
 * @return {Transaction}
 */

Store.prototype.clear = function(cb) {
  var tr = this.db.write(this);
  var objectStore = tr.origin.objectStore(this.name);
  var req = objectStore.clear();

  if (cb) {
    request(req, function(err) { if (err) cb(err) });
    tr.once('complete', cb);
    tr.once('error', cb);
  }

  return tr;
};
