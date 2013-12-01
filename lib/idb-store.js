var request = require('idb-request');

/**
 * Local variables.
 */

var indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB;
var indexOf = Array.prototype.indexOf;

/**
 * `IDBStore` construtor.
 * Wrap IndexedDB API with nice async methods.
 *
 * @param {String} dbName
 * @param {Object} storeName
 */

function IDBStore(dbName, storeName) {
  this.dbName = dbName;
  this.name = storeName;
  this.connected = false;
}

IDBStore.dbs = {};
IDBStore.configs = {};

IDBStore.close = function(name) {
  if (IDBStore.dbs[name]) IDBStore.dbs[name].close();
  delete IDBStore.configs[name];
  delete IDBStore.dbs[name];
};

/**
 * Setup read transaction.
 *
 * @param {Function} cb
 */

IDBStore.prototype.read = function(cb) {
  this.transaction('readonly', cb);
};

/**
 * Setup write transaction.
 *
 * @param {Function} cb
 */

IDBStore.prototype.write = function(cb) {
  this.transaction('readwrite', cb);
};

/**
 * Creates new transaction and returns object store.
 *
 * @param {String} mode - readwrite|readonly
 * @param {Function} cb
 */

IDBStore.prototype.transaction = function(mode, cb) {
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

IDBStore.prototype.getVersion = function(db) {
  var defaults = { version: db.version || 1, stores: [] };
  var config = Object.create(IDBStore.configs[this.dbName] || defaults);

  if (config.stores.indexOf(this.name) < 0) {
    config.stores.push(this.name);
    if (indexOf.call(db.objectStoreNames, this.name) < 0) config.version += 1;
  }

  IDBStore.configs[this.dbName] = config;
  return config.version;
};

/**
 * Returns db instance,
 * performs connection and upgrade if needed.
 *
 * @param {Function} cb
 */

IDBStore.prototype.getDb = function(cb) {
  var db = IDBStore.dbs[this.dbName];

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

IDBStore.prototype.connectOrUpgrade = function(db, cb) {
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

IDBStore.prototype.open = function(version, cb) {
  var that = this;
  var req = indexedDB.open(this.dbName, version);

  req.onupgradeneeded = function(event) {
    event.result.createObjectStore(that.name, { autoIncrement: false });
  };

  request(req, function(err, event) {
    if (err) return cb(err);

    IDBStore.dbs[that.dbName] = event.result;
    that.connectOrUpgrade(event.result, cb);
  });
};
