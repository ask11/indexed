var request = require('idb-request');
var asyncEach = require('async-each');
var Stream = require('stream');
var idb = require('./idb');

/**
 * Expose `IDBBackend` as `Indexed.Backend`.
 */

module.exports = exports = function(Indexed) {
  Indexed.Backend = IDBBackend;
};

/**
 * This flag incicates about support of latest IndexedDB standart.
 * The reasons for this requirements are `2-parameter open` and `string values for transaction modes`.
 * Check https://developer.mozilla.org/en-US/docs/Web/API/IDBDatabase#Browser_Compatibility
 * for irrefragable answer.
 *
 * @api public
 */

exports.supported = (function() {
  var indexedDB         = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB;
  var IDBDatabase       = window.IDBDatabase || window.webkitIDBDatabase;
  var IDBTransaction    = window.IDBTransaction || window.webkitIDBTransaction;
  var hasIndexedDB      = !! indexedDB;
  var hasOnUpgradeEvent = IDBDatabase && ! IDBDatabase.prototype.setVersion;
  var hasStringModes    = IDBTransaction && IDBTransaction.READ_WRITE !== 1;

  return hasIndexedDB && hasOnUpgradeEvent && hasStringModes;
})();

/**
 * `IDBBackend` construtor.
 * Wrap IndexedDB API with readable async methods.
 *
 * @param {String} dbName
 * @param {String} storeName
 * @api public
 */

function IDBBackend(dbName, storeName) {
  this.name = storeName;
  this.db = idb(dbName);
}

/**
 * Drop IndexedDB instance by dbName.
 * Shortcut for `indexedDB.deleteDatabase`
 *
 * @param {String} `dbName`
 * @param {function} cb
 * @api public
 */

IDBBackend.dropDb = function(dbName, cb) {
  idb(dbName).drop(cb);
};

/**
 * Get value by `key`.
 *
 * @param {String} key
 * @param {Function} cb
 * @api public
 */

IDBBackend.prototype.get = function(key, cb) {
  this.store('read', cb, function(store) {
    request(store.get(key), function(err, e) { cb(err, e.target.result) });
  });
};

/**
 * Delete value by `key`.
 *
 * @param {String} key
 * @param {Function} cb
 * @api public
 */

IDBBackend.prototype.del = function(key, cb) {
  this.store('write', cb, function(store) {
    request(store.delete(key), cb);
  });
};

/**
 * Put - replace or create `val` with `key`.
 *
 * @param {String} key
 * @param {Mixin} val
 * @param {Function} cb
 * @api public
 */

IDBBackend.prototype.put = function(key, val, cb) {
  this.store('write', cb, function(store) {
    request(store.put(val, key), cb);
  });
};

/**
 * Clear store.
 *
 * @param {Function} cb
 * @api public
 */

IDBBackend.prototype.clear = function(cb) {
  this.store('write', cb, function(store) {
    request(store.clear(), cb);
  });
};

/**
 * Batch async put/del operations in one transaction.
 *
 * @param {Array} ops
 * @param {Function} cb
 * @api public
 */

IDBBackend.prototype.batch = function(ops, cb) {
  this.store('write', cb, function(store) {
    asyncEach(ops, function(op, next) {
      var req = op.type == 'put' ?
        store.put(op.value, op.key) :
        store.delete(op.key);

      request(req, next);
    }, cb);
  });
};

/**
 * Read data from the store and filter with start/end `options`.
 *
 * @param {Object} options
 * @param {String} indexName
 * @return {Stream}
 * @api public
 */

IDBBackend.prototype.createReadStream = function(options, transform) {
  var stream = new Stream();
  stream.readable = true;

  function cb(err) {
    stream.emit('error', err);
  }

  this.store('read', cb, function(store) {
    request(store.openCursor(), function(err, e) {
      if (err) return cb(err);
      var cursor = e.target.result;

      if (cursor) {
        stream.emit('data', transform(cursor.key, cursor.value));
        cursor.continue();
      } else {
        stream.emit('end');
      }
    });
  });

  return stream;
};

/**
 * Open store for read or write.
 * It uses `cb` to gracefully handle errors and calls `fn` with `store`.
 *
 * @param {String} mode
 * @param {Function} cb
 * @param {Function} fn
 * @api private
 */

IDBBackend.prototype.store = function(mode, cb, fn) {
  mode = mode == 'read' ? 'readonly' : 'readwrite';

  this.db.get(this.name, mode, function(err, store) {
    err ? cb(err) : fn(store);
  });
};
