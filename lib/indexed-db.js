var request = require('idb-request');
var asyncEach = require('async-each');
var Stream = require('stream');
var idb = require('./idb');

/**
 * Local variables.
 */

var indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB;
var slice = Array.prototype.slice;

/**
 * Expose `IndexedDBBackend` as `Indexed.Backend`.
 */

module.exports = function(Indexed) {
  Indexed.Backend = IndexedDBBackend;
};

/**
 * `IndexedDBBackend` construtor.
 * Wrap IndexedDB API with readable async methods.
 *
 * @param {String} db
 * @param {Object} name
 */

function IndexedDBBackend(db, name) {
  this.db = db;
  this.name = name;
}

/**
 * Drop IndexedDB instance by name.
 * Shortcut for `indexedDB.deleteDatabase`
 *
 * @param {String} `name`
 * @param {function} cb
 */

IndexedDBBackend.dropDb = function(name, cb) {
  idb.close(name);
  request(indexedDB.deleteDatabase(name), cb);
};

/**
 * This flag incicates about support of latest IndexedDB standart.
 * The reasons for this requirements are `2-parameter open` and `string values for transaction modes`.
 * Check https://developer.mozilla.org/en-US/docs/Web/API/IDBDatabase#Browser_Compatibility
 * for irrefragable answer.
 */

IndexedDBBackend.supported = (function() {
  var IDBDatabase       = window.IDBDatabase || window.webkitIDBDatabase;
  var IDBTransaction    = window.IDBTransaction || window.webkitIDBTransaction;
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

IndexedDBBackend.prototype.get = checkStore(function(key, cb) {
  request(this.store('read').get(key), function(err, event) {
    cb(err, event.target.result);
  });
});

/**
 * Delete value by `key`.
 *
 * @param {String} key
 * @param {Function} cb
 */

IndexedDBBackend.prototype.del = checkStore(function(key, cb) {
  request(this.store('write').delete(key), function(err) { cb(err) });
});

/**
 * Put - replace or create `val` with `key`.
 *
 * @param {String} key
 * @param {Mixin} val
 * @param {Function} cb
 */

IndexedDBBackend.prototype.put = checkStore(function(key, val, cb) {
  request(this.store('write').put(val, key), function(err) { cb(err) });
});

/**
 * Clear store.
 *
 * @param {Function} cb
 */

IndexedDBBackend.prototype.clear = checkStore(function(cb) {
  request(this.store('write').clear(), function(err) { cb(err) });
});

/**
 * Batch async put/del operations in one transaction.
 *
 * @param {Array} ops
 * @param {Function} cb
 */

IndexedDBBackend.prototype.batch = checkStore(function(ops, cb) {
  var store = this.store('write');

  asyncEach(ops, function(op, next) {
    var req = op.type == 'put' ?
      store.put(op.key, op.value) :
      store.delete(op.key);

    request(req, next);
  }, cb);
});

/**
 * Read data from the store for selected `range`.
 *
 * @param {Object} range
 * @param {String} indexName
 * @return {Stream}
 */

IndexedDBBackend.prototype.createReadStream = checkIndex(function(name, transform) {
  var req = this.store('read').index(name).openCursor();
  var stream = new Stream();
  stream.readable = true;

  request(req, function(err, event) {
    if (err) return stream.emit('error', err);
    var cursor = event.target.result;

    if (cursor) {
      stream.emit('data', transform(cursor.key, cursor.value));
      cursor.continue();
    } else {
      stream.emit('end');
    }
  });

  return stream;
});

/**
 * Open store for read or write.
 *
 * @param {String} mode
 @ @return {IDBObjectStore}
 */

IndexedDBBackend.prototype.store = function(mode) {
  mode = mode == 'read' ? 'readonly' : 'readwrite';
  return idb.dbs[this.db].transaction(this.name, mode).objectStore(this.name);
};

/**
 * Helper to make sure, that index with name exists.
 */

function checkIndex(fn) {
  return function() {
    var args = slice.call(arguments);
    var indexName = args[0];
    var that = this;

    idb.checkIndex(this.db, this.name, indexName, function(err) {
      if (err) throw err; // FIXME: handle differently
      fn.apply(that, args);
    });
  };
}

/**
 * Helper to make sure, that store exists in current db.
 */

function checkStore(fn) {
  return function() {
    var args = slice.call(arguments);
    var cb = args[args.length - 1];
    var that = this;

    idb.checkStore(this.db, this.name, function(err) {
      if (err) return cb(err);
      fn.apply(that, args);
    });
  };
}
