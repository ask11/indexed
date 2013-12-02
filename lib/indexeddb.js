var request = require('idb-request');
var asyncEach = require('async-each');
var Stream = require('stream');

/**
 * Local variables.
 */

var indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB;
var slice = Array.prototype.slice;
var indexOf = Array.prototype.indexOf;

/**
 * Expose `IndexedDBBackend` as `Indexed.Backend`.
 */

module.exports = exports = function(Indexed) {
  Indexed.Backend = IndexedDBBackend;
};

/**
 * This flag incicates about support of latest IndexedDB standart.
 * The reasons for this requirements are `2-parameter open` and `string values for transaction modes`.
 * Check https://developer.mozilla.org/en-US/docs/Web/API/IDBDatabase#Browser_Compatibility
 * for irrefragable answer.
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
 * `IndexedDBBackend` construtor.
 * Wrap IndexedDB API with readable async methods.
 *
 * @param {String} db
 * @param {String} name
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
      store.put(op.value, op.key) :
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
 * Helper to make sure,
 * that store exists in current db.
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

/**
 * Helper to make sure,
 * that index with name exists.
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
 * Define `IDB` construtor to manage multiply databases.
 */

function IDB() {
  this.dbs = Object.create(null);
}

/**
 * Open `dbName` with specified `version`.
 * `version` is optional and mostly uses to run `req.onupgradeneeded`
 *
 * @param {String} dbName
 * @param {Number} version
 * @param {Function} cb
 * @return {IDBRequest}
 */

IDB.prototype.open = function(dbName, version, cb) {
  if (!cb) { cb = version; version = null; }
  var db = this.dbs[dbName];

  if (db) {
    if (version && db.version != version) {
      this.close(dbName);
    } else {
      return cb(null, db);
    }
  }

  var req = version ? indexedDB.open(dbName, version) : indexedDB.open(dbName);
  var that = this;

  request(req, function(err, event) {
    if (err) return cb(err);
    that.dbs[dbName] = event.target.result;
    cb(null, that.dbs[dbName]);
  });

  return req;
};

/**
 * Close by `dbName`.
 *
 * @param {String} dbName
 */

IDB.prototype.close = function(dbName) {
  if (!this.dbs[dbName]) return;
  this.dbs[dbName].close();
  delete this.dbs[dbName];
};

/**
 * Make sure that `storeName` exists.
 * If not, force `onupgradeneeded` event and create it.
 *
 * @param {String} dbName
 * @param {String} storeName
 * @param {Function} cb
 */

IDB.prototype.checkStore = function(dbName, storeName, cb) {
  var that = this;

  this.open(dbName, function(err, db) {
    if (err) return cb(err);
    if (indexOf.call(db.objectStoreNames, storeName) == -1) {
      var req = that.open(dbName, db.version + 1, function(err) { cb(err) });

      req.onupgradeneeded = function(event) {
        event.target.result.createObjectStore(storeName, { autoIncrement: false });
      };
    } else {
      cb(null);
    }
  });
};

/**
 * Make sure that `indexName` exists in `storeName`.
 * If not, force `onupgradeneeded` event and create new index.
 *
 * @param {String} dbName
 * @param {String} storeName
 * @param {String} indexName
 * @param {Function} cb
 */

IDB.prototype.checkIndex = function(dbName, storeName, indexName, cb) {
  var that = this;

  this.checkStore(dbName, storeName, function(err) {
    if (err) return cb(err);
    var db = that.dbs[dbName];
    var store = db.transaction(storeName, 'readonly').objectStore(storeName);  // FIXME: additional transaction

    if (indexOf.call(store.indexNames, indexName) == -1) {
      var req = that.open(dbName, db.version + 1, function(err) { cb(err) });

      req.onupgradeneeded = function(event) {
        // use current transaction
        var store = event.currentTarget.transaction.objectStore(storeName);
        var fields = indexName.join(',');

        store.createIndex(indexName, fields, { unique: false });
      };
    } else {
      cb(null);
    }
  });
};

// Expose one `IDB` instance between all modules.
var idb = new IDB();
