var request = require('idb-request');
var asyncEach = require('async-each');
var Stream = require('stream');

/**
 * Local variables.
 */

var indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB;
var indexOf = Array.prototype.indexOf;

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
}).call(this);

/**
 * `IDBBackend` construtor.
 * Wrap IndexedDB API with readable async methods.
 *
 * @param {String} dbName
 * @param {String} storeName
 * @api public
 */

function IDBBackend(dbName, storeName) {
  this.dbName = dbName;
  this.storeName = storeName;
  this.transactions = {};
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
  IDBBackend.close(dbName);
  request(indexedDB.deleteDatabase(dbName), cb);
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
 * Store db connections.
 *
 * @api private
 */

IDBBackend.dbs = Object.create(null);

/**
 * Close db and clear `IDBBackend.dbs`.
 *
 * @param {String} dbName
 * @api private
 */

IDBBackend.close = function(dbName) {
  var db = IDBBackend.dbs[dbName];
  if (!db) return;
  db.close();
  delete IDBBackend.dbs[dbName];
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
  var that = this;

  this.connect(function(err) {
    if (err) return cb(err);
    fn(that.transaction(mode).objectStore(that.name));
  });
};

/**
 * Manage transactions.
 * It helps avoid to create of many transactions for each operation.
 * We use `readwrite` transaction, when it's available and `readonly` not initialized.
 *
 * @param {String} mode
 @ @return {IDBTransaction}
 * @api private
 */

IDBBackend.prototype.transaction = function(mode) {
  var transactions = this.transactions;
  var hasRead = mode == 'readonly' && !transactions.readonly && transactions.readwrite;
  var transaction = hasRead ? transactions.readwrite : transactions[mode];
  var db = IDBBackend.dbs[this.dbName];

  if (!transaction) {
    transaction = db.transaction(this.storeName, mode);
    transactions[mode] = transaction;

    // TODO: add `onerror` and `onabord` handlers.
    transaction.oncomplete = function() {
      delete transactions[mode];
    };
  }

  return transaction;
};

/**
 * Open `this.dbName` with specified `version`.
 * `version` is optional and uses to run `req.onupgradeneeded`.
 *
 * @param {Number} [version]
 * @param {Function} cb
 * @return {IDBRequest}
 */

IDBBackend.prototype.open = function(version, cb) {
  var dbName = this.dbName;
  var db = IDBBackend.dbs[dbName];
  var changeVersion = version && db.version !== version;

  // close current connection when we need to upgrade.
  if (db) changeVersion ? IDBBackend.close(dbName) : cb(null, db);

  // try to avoid version change at first connection.
  var req = version ? indexedDB.open(dbName, version) : indexedDB.open(dbName);

  request(req, function(err, event) {
    if (err) return cb(err);
    var db = event.target.result;

    IDBBackend.dbs[dbName] = db;
    cb(null, db);
  });

  return req;
};

/**
 * Make sure that `this.storeName` exists.
 * If not, force `onupgradeneeded` event and create it.
 *
 * @param {Function} cb
 */

IDBBackend.prototype.connect = function(cb) {
  var that = this;

  this.open(null, function(err, db) {
    if (err) return cb(err);
    if (indexOf.call(db.objectStoreNames, that.storeName) == -1) {
      var req = that.open(db.version + 1, function(err) { cb(err) });

      req.onupgradeneeded = function(event) {
        var db = event.target.result;
        db.createObjectStore(that.storeName, { autoIncrement: false });
      };
    } else {
      cb(null);
    }
  });
};
