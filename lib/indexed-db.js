var request = require('idb-request');
var Store = require('./idb-store');
var connect = Store.connect;

/**
 * Local variables.
 */

var indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB;
var IDBDatabase = window.IDBDatabase || window.webkitIDBDatabase;
var IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction;

/**
 * Expose `IndexedDBBackend` as `Indexed.Backend`.
 */

module.exports = function(Indexed) {
  Indexed.Backend = IndexedDBBackend;
};

/**
 * `IndexedDBBackend` construtor.
 * Wrap IndexedDB API with nice async methods.
 *
 * @param {String} dbName
 * @param {Object} storeName
 */

function IndexedDBBackend(dbName, storeName) {
  this._store = new Store(dbName, storeName);
}

/**
 * Drop IndexedDB instance by name.
 * Shortcut for `indexedDB.deleteDatabase`
 *
 * @param {String} `name`
 * @param {function} cb
 */

IndexedDBBackend.dropDb = function(name, cb) {
  Store.close(name);
  request(indexedDB.deleteDatabase(name), cb);
};

/**
 * This flag incicates about support of latest IndexedDB standart.
 * The reasons for this requirements are `2-parameter open` and `string values for transaction modes`.
 * Check https://developer.mozilla.org/en-US/docs/Web/API/IDBDatabase#Browser_Compatibility
 * for irrefragable answer.
 */

IndexedDBBackend.supported = (function() {
  var hasIndexedDB      = !! indexedDB;
  var hasOnUpgradeEvent = IDBDatabase && ! IDBDatabase.prototype.setVersion;
  var hasStringModes    = IDBTransaction && IDBTransaction.READ_WRITE !== 1;

  return hasIndexedDB && hasOnUpgradeEvent && hasStringModes;
}).call(this);

/**
 * Get value by `key`.
 *
 * @param {String} key
 * @param {Function} cb
 */

IndexedDBBackend.prototype.get = connect(function(key, cb) {
  request(this.store('read').get(key), function(err, event) {
    cb(err, event.result);
  });
});

/**
 * Delete value by `key`.
 *
 * @param {String} key
 * @param {Function} cb
 */

IndexedDBBackend.prototype.del = connect(function(key, cb) {
  request(this.store('write').delete(key), function(err) { cb(err) });
});

/**
 * Put - replace or create `val` with `key`.
 *
 * @param {String} key
 * @param {Mixin} val
 * @param {Function} cb
 */

IndexedDBBackend.prototype.put = connect(function(key, val, cb) {
  request(this.store('write').put(val, key), function(err) { cb(err) });
});

/**
 * Clear store.
 *
 * @param {Function} cb
 */

IndexedDBBackend.prototype.clear = connect(function(cb) {
  request(this.store('write').clear(), function(err) { cb(err) });
});
