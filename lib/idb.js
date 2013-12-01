var request = require('idb-request');

/**
 * Local variables.
 */

var indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB;
var indexOf = Array.prototype.indexOf;

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
  if (!cb) cb = version; version = null;
  var db = this.dbs[dbName];

  if (db) {
    if (version && db.version != version) {
      this.close(dbName);
    } else {
      return cb(null, db);
    }
  }

  var req = indexedDB.open(dbName, version);
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
module.exports = new IDB();
