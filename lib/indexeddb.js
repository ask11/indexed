var request = require('idb-request');
var asyncEach = require('async-each');
var idb = require('idb');
var Stream = require('stream');

/**
 * IndexedDB references.
 */

var indexedDB = window.indexedDB
  || window.mozIndexedDB
  || window.webkitIndexedDB;

var IDBKeyRange = window.IDBKeyRange
  || window.mozIDBKeyRange
  || window.webkitIDBKeyRange;

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
 * @param {String} db
 * @param {String} name
 * @api public
 */

function IDBBackend(db, name) {
  this.name = name;
  this.db = idb(db);
}

/**
 * Remove all data associated with `db` name.
 *
 * @param {String} `db`
 * @param {function} cb
 * @api public
 */

IDBBackend.dropDb = function(db, cb) {
  idb(db).drop(cb);
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
    request(store.get(key), function(err, e) {
      cb(err, e.target.result);
    });
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
  this.store('write', cb, function(store, commit) {
    commit(store.delete(key), cb);
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
  this.store('write', cb, function(store, commit) {
    commit(store.put(val, key), cb);
  });
};

/**
 * Clear store.
 *
 * @param {Function} cb
 * @api public
 */

IDBBackend.prototype.clear = function(cb) {
  this.store('write', cb, function(store, commit) {
    commit(store.clear(), cb);
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
  this.store('write', cb, function(store, commit) {
    asyncEach(ops, function(op, next) {
      var req = op.type == 'put' ?
        store.put(op.value, op.key) :
        store.delete(op.key);

      request(req, next);
    }, function(err) {
      if (err) return err;
      commit(null, cb);
    });
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
    var end = (options.end || '') + '\uffff';
    var range = IDBKeyRange.bound(options.start || '', end);

    request(store.openCursor(range), function(err, e) {
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
  this.db[mode](this.name, function(err, store, commit) {
    err ? cb(err) : fn(store, commit);
  });
};
