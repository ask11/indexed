
/**
 * Module dependencies.
 */

var clone     = require('clone');
var type      = require('type');
var defaults  = require('defaults');
var inherit   = require('inherit');
var LevelDown = require('../vendor/abstract-leveldown/abstract-leveldown').AbstractLevelDOWN;
var buffer    = require('./buffer');
var utils     = require('./utils');

/**
 * Local variables.
 */

var indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB;
var indexOf   = Array.prototype.indexOf;
var slice     = Array.prototype.slice;
var dbs       = {};
var configs   = {};

/**
 * Expose `Indexed`.
 */

module.exports = Indexed;

/**
 * Construtor to wrap IndexedDB API with nice async methods.
 * `name` contains db-name and store-name splited with colon.
 *
 * Example:
 *
 *   // connect to db with name `notepad`, use store `notes`
 *   // use _id field as a key
 *   var indexed = new Indexed('notepad:notes', { key: '_id' });
 *
 * @options {String} name
 * @options {Object} options
 * @api public
 */

function Indexed(name, options) {
  if (typeof name !== 'string') throw new TypeError('name required');
  if (!options) options = {};
  var params = name.split(':');

  this.dbName      = params[0];
  this.name        = params[1];
  this.key         = options.key || 'id';
  this.openOptions = { createIfMissing: true, errorIfExists: false };
  this.connected   = false;
}

inherit(Indexed, LevelDown);

/**
 * Delete IndexedDB instance by name.
 * Shortcut for `indexedDB.deleteDatabase`
 *
 * @options {String} `dbName`
 * @options {function} cb
 * @api public
 */

Indexed.destroy = function(dbName, cb) {
  if (dbs[dbName]) dbs[dbName].close();
  delete configs[dbName];
  delete dbs[dbName];
  request(indexedDB.deleteDatabase(dbName), cb);
};

/**
 * This flag incicates about support of latest IndexedDB standart.
 *
 *
 * Indexed tryes to build on top of latest standart http://www.w3.org/TR/2013/CR-IndexedDB-20130704/,
 * so it works on Chrome 25+, IE10+, FF13+.
 * The reasons for this requirements are `2-parameter open` and `string values for transaction modes`.
 * Check https://developer.mozilla.org/en-US/docs/Web/API/IDBDatabase#Browser_Compatibility
 * for irrefragable answer.
 */

Indexed.supported = (function() {
  var IDBDatabase       = window.IDBDatabase || window.webkitIDBDatabase;
  var IDBTransaction    = window.IDBTransaction || window.webkitIDBTransaction;
  var hasOnUpgradeEvent = IDBDatabase && ! IDBDatabase.prototype.setVersion;
  var hasStringModes    = IDBTransaction && IDBTransaction.READ_WRITE !== 1;
  var hasIndexedDB      = !! indexedDB;

  return hasIndexedDB && hasOnUpgradeEvent && hasStringModes;
}).call(this);

/**
 * Get all values from the object store.
 *
 * @options {Function} cb
 * @api public
 */

Indexed.prototype.all = transaction('readonly', function(store, tr, cb) {
  var result = [];
  request(store.openCursor(), function(err) {
    var cursor = this.result;
    if (cursor) {
      result.push(cursor.value);
      cursor['continue']();
    } else {
      cb(null, result);
    }
  });
});

/**
 * Clear object store.
 *
 * @options {Function} cb
 * @api public
 */

Indexed.prototype.clear = transaction('readwrite', function(store, tr, cb) {
  request(store.clear(), tr, cb);
});

/**
 * Open database for current Indexed instance
 *
 * @options {Object} options - optional
 * @options {Function} cb
 * @api public as open
 */

Indexed.prototype._open = function(options, cb) {
  this.openOptions = defaults(options, this.openOptions);
  this._getDb(function(err) { cb(err, this); });
};

/**
 * Close access to database
 * TODO: count connections to one db, and call close for last one
 *
 * @options {Function} cb
 * @api public as close
 */

Indexed.prototype._close = function(cb) {
  this.connected = false;
  process.nextTick(cb);
};

/**
 * Get object by `key`.
 *
 * @options {Mixin} key
 * @options {Function} cb
 * @api public as get
 */

Indexed.prototype._get = transaction('readonly', function(store, tr, key, options, cb) {
  options = defaults(options, { asBuffer: true });
  request(store.get(key), function(err) {
    var val = this.result;
    if (!val) return cb(new Error('NotFound'));
    if (options.asBuffer) val = buffer.strToBuffer(val);
    cb(null, val);
  });
});

/**
 * Delete object by `key`.
 *
 * @options {Mixin} key
 * @options {Function} cb
 * @api public as del
 */

Indexed.prototype._del = transaction('readwrite', function(store, tr, key, options, cb) {
  request(store['delete'](key), tr, cb);
});

/**
 * Put - replace or create object by `key` with `val`.
 * Extends `val` with `key` automatically.
 *
 * @options {Mixin} key
 * @options {Mixin} val
 * @options {Function} cb
 * @api public as put
 */

Indexed.prototype._put = transaction('readwrite', function(store, tr, key, val, options, cb) {
  val = utils.toString(val);
  request(store.put(val, key), tr, function(err) {
    cb(err, val);
  });
});

// Check Buffer, use in AbstractLevelDOWN
Indexed.prototype._isBuffer = buffer.isBuffer;

// Validate key or value, use in AbstractLevelDOWN
Indexed.prototype._checkKeyValue = utils.checkKeyValue;

/**
 * Creates new transaction and returns object store.
 *
 * @options {String} mode - readwrite|readonly
 * @options {Function} cb
 * @api private
 */

Indexed.prototype._getStore = function(mode, cb) {
  this._getDb(function(err, db) {
    if (err) return cb(err);

    var transaction = db.transaction(this.name, mode);
    var objectStore = transaction.objectStore(this.name);
    cb.call(this, null, objectStore, transaction);
  });
};

/**
 * Returns db instance, performs connection and upgrade if needed.
 *
 * @options {Function} cb
 * @api private
 */

Indexed.prototype._getDb = function(cb) {
  var that = this;
  var db   = dbs[this.dbName];

  if (db) {
    if (this.connected) return cb.call(that, null, db);
    this._connectOrUpgrade(db, cb);
  } else {
    request(indexedDB.open(this.dbName), function(err) {
      if (err) return cb(err);

      dbs[that.dbName] = this.result;
      that._connectOrUpgrade(this.result, cb);
    });
  }
};

/**
 * Check that `db.version` is equal to config version or
 * Performs connect or db upgrade.
 *
 * @options {Object} db
 * @options {Function} cb
 * @api private
 */

Indexed.prototype._connectOrUpgrade = function(db, cb) {
  var version = this._getVersion(db);

  if (version !== db.version) {
    this._upgrade(db, cb);
  } else {
    if (this.openOptions.errorIfExists)
      return cb(new Error('Store already exists'));

    this.connected = true;
    cb.call(this, null, db);
  }
};

/**
 * Close current db connection and open new.
 * Create object store if needed and recreate it when keyPath changed.
 *
 * @options {Object} db
 * @options {Function} cb
 * @api private
 */

Indexed.prototype._upgrade = function(db, cb) {
  var that    = this;
  var version = this._getVersion(db);

  if (version !== db.version && !that.openOptions.createIfMissing)
    return cb(new Error('Store does not exist'));

  db.close();
  var req = request(indexedDB.open(this.dbName, version), function(err) {
    if (err) return cb(err);

    dbs[that.dbName] = this.result;
    that.connected = true;
    cb.call(that, null, this.result);
  });

  req.onupgradeneeded = function(event) {
    this.result.createObjectStore(that.name, { autoIncrement: false });
  };
};

/**
 * Returns required `db` version.
 *
 * @options {Object} db
 * @api private
 */

Indexed.prototype._getVersion = function(db) {
  var defaults = { version: db.version || 1, stores: [] };
  var config   = clone(configs[this.dbName] || defaults);

  if (config.stores.indexOf(this.name) < 0) {
    config.stores.push(this.name);
    if (indexOf.call(db.objectStoreNames, this.name) < 0) config.version += 1;
  }

  configs[this.dbName] = config;
  return config.version;
};

/**
 * Helper to simplify requests to IndexedDB API.
 * Helps to manage errors, and `onsuccess` and `oncomplete` events
 *
 * @options {Function} method - ready to call request
 * @options {IDBTransaction} tr
 * @options {Function} cb
 * @return {IDBRequest} req
 */

function request(req, tr, cb) {
  var method = cb || tr;
  req.onerror = function(event) { method.call(this, event); };

  if (!cb)
    req.onsuccess = function(event) { method.call(this, null); };
  else
    tr.oncomplete = function(event) { method.call(this, null); };

  return req;
}

/**
 * Helper to force new transaction for current store.
 *
 * @options {String} mode {readwrite|readonly}
 * @options {Function} handler
 * @return {Function}
 */

function transaction(mode, handler) {
  return function() {
    var args = slice.call(arguments, 0);
    var cb   = args[args.length - 1];

    this._getStore(mode, function(err, store, tr) {
      if (err) return cb(err);
      handler.apply(this, [store, tr].concat(args));
    });
  };
}
