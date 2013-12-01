var request = require('idb-request');

/**
 * Local variables.
 */

var indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB;
var indexOf = Array.prototype.indexOf;
var dbs = {};
var configs = {};

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
  this.dbName = dbName;
  this.name = storeName;
  this.connected = false;
}

/**
 * Drop IndexedDB instance by name.
 * Shortcut for `indexedDB.deleteDatabase`
 *
 * @param {String} `name`
 * @param {function} cb
 */

IndexedDBBackend.dropDb = function(name, cb) {
  if (dbs[name]) dbs[name].close();
  delete configs[name];
  delete dbs[name];
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
  var hasOnUpgradeEvent = IDBDatabase && ! IDBDatabase.prototype.setVersion;
  var hasStringModes    = IDBTransaction && IDBTransaction.READ_WRITE !== 1;
  var hasIndexedDB      = !! indexedDB;

  return hasIndexedDB && hasOnUpgradeEvent && hasStringModes;
}).call(this);

/**
 * Get value by `key`.
 *
 * @param {String} key
 * @param {Function} cb
 */

IndexedDBBackend.prototype.get = function(key, cb) {
  this.transaction(cb, 'readonly', function(err, store) {
    err ? cb(err) :
      request(store.get(key), function(err, event) { cb(err, event.result) });
  });
};

/**
 * Delete value by `key`.
 *
 * @param {String} key
 * @param {Function} cb
 */

IndexedDBBackend.prototype.del = function(key, cb) {
  this.transaction('readwrite', function(err, store) {
    err ? cb(err) :
      request(store.delete(key), function(err) { cb(err) });
  });
};

/**
 * Put - replace or create object by `key` with `val`.
 *
 * @param {String} key
 * @param {Mixin} val
 * @param {Function} cb
 */

IndexedDBBackend.prototype.put = function(key, val, cb) {
  this.transaction('readwrite', function(err, store) {
    err ? cb(err) :
      request(store.put(val, key), function(err) { cb(err) });
  });
};

/**
 * Clear store.
 *
 * @param {Function} cb
 */

IndexedDBBackend.prototype.clear = function(cb) {
  this.transaction('readwrite', function(err, store) {
    err ? cb(err) :
      request(store.clear(), function(err) { cb(err) });
  });
};

/**
 * Creates new transaction and returns object store.
 *
 * @param {String} mode - readwrite|readonly
 * @param {Function} cb
 */

IndexedDBBackend.prototype.transaction = function(mode, cb) {
  var name = this.name;

  this.getDb(function(err, db) {
    if (err) return cb(err);

    var store = db.transaction(name, mode).objectStore(name);
    cb(null, store);
  });
};

/**
 * Returns required `db` version.
 *
 * @param {Object} db
 * @return {Number}
 */

IndexedDBBackend.prototype.getVersion = function(db) {
  var defaults = { version: db.version || 1, stores: [] };
  var config = Object.create(configs[this.dbName] || defaults);

  if (config.stores.indexOf(this.name) < 0) {
    config.stores.push(this.name);
    if (indexOf.call(db.objectStoreNames, this.name) < 0) config.version += 1;
  }

  configs[this.dbName] = config;
  return config.version;
};

/**
 * Returns db instance,
 * performs connection and upgrade if needed.
 *
 * @param {Function} cb
 */

IndexedDBBackend.prototype.getDb = function(cb) {
  var db = dbs[this.dbName];

  if (db) {
    if (this.connected) return cb(null, db);
    this.connectOrUpgrade(db, cb);
  } else {
    this.open(undefined, cb);
  }
};

/**
 * Check that `db.version` is equal to config version or
 * Performs connect or db upgrade.
 *
 * @param {Object} db
 * @param {Function} cb
 */

IndexedDBBackend.prototype.connectOrUpgrade = function(db, cb) {
  var version = this.getVersion(db);

  if (version !== db.version) {
    db.close();
    this.open(db, version, cb);
  } else {
    this.connected = true;
    cb(null, db);
  }
};

/**
 * Close current db connection and open new one.
 * It creates object store if needed.
 *
 * @param {Object} db
 * @param {Function} cb
 */

IndexedDBBackend.prototype.open = function(version, cb) {
  var that = this;
  var req = indexedDB.open(this.dbName, version);

  req.onupgradeneeded = function(event) {
    event.result.createObjectStore(that.name, { autoIncrement: false });
  };

  request(req, function(err, event) {
    if (err) return cb(err);

    dbs[that.dbName] = event.result;
    that.connectOrUpgrade(event.result, cb);
  });
};
