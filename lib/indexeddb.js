var request = require('idb-request');
var asyncEach = require('async-each');
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
  this.name = db + ':' + name;
}

/**
 * Remove all data associated with `db` name.
 *
 * @param {String} `db`
 * @param {function} cb
 * @api public
 */

IDBBackend.dropDb = clear;

/**
 * Get value by `key`.
 *
 * @param {String} key
 * @param {Function} cb
 * @api public
 */

IDBBackend.prototype.get = function(key, cb) {
  key = this.key(key);
  store('read', cb, function(store) {
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
  key = this.key(key);
  store('write', cb, function(store, tr) {
    commit(store.delete(key), tr, cb);
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
  key = this.key(key);
  store('write', cb, function(store, tr) {
    commit(store.put(val, key), tr, cb);
  });
};

/**
 * Clear store.
 *
 * @param {Function} cb
 * @api public
 */

IDBBackend.prototype.clear = function(cb) {
  clear(this.name, cb);
};

/**
 * Batch async put/del operations in one transaction.
 *
 * @param {Array} ops
 * @param {Function} cb
 * @api public
 */

IDBBackend.prototype.batch = function(ops, cb) {
  var that = this;

  store('write', cb, function(store, tr) {
    asyncEach(ops, function(op, next) {
      var key = that.key(op.key);
      var req = op.type == 'put' ?
        store.put(op.value, key) :
        store.delete(key);

      request(req, next);
    }, function(err) {
      if (err) return err;
      tr.oncomplete = function() { cb(null) };
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
  var that = this;
  var range = IDBKeyRange.bound(this.name, this.name + '\uffff');
  var stream = new Stream();
  stream.readable = true;

  function cb(err) {
    stream.emit('error', err);
  }

  store('read', cb, function(store) {
    request(store.openCursor(range), function(err, e) {
      if (err) return cb(err);
      var cursor = e.target.result;

      if (cursor) {
        var key = cursor.key.replace(that.name + ':', '');
        stream.emit('data', transform(key, cursor.value));
        cursor.continue();
      } else {
        stream.emit('end');
      }
    });
  });

  return stream;
};

/**
 * Return key associated with `this.name` namespace.
 *
 * @param {String} key
 * @return {String}
 * @api private
 */

IDBBackend.prototype.key = function(key) {
  return this.name + ':' + key;
};


/**
 * Clear all data from the store matching `bound`.
 *
 * @param {String} bound
 * @param {Function} cb
 * @api private
 */

function clear(bound, cb) {
  store('write', cb, function(store) {
    var range = IDBKeyRange.bound(bound, bound + '\uffff');

    request(store.openCursor(range), function(err, e) {
      if (err) return cb(err);
      var cursor = e.target.result;

      if (cursor) {
        store.delete(cursor.key);
        cursor.continue();
      } else {
        cb();
      }
    });
  });
}

var req = null;

function getDb(cb) {
  if (req && req.readyState == 'done')
    return cb(null, req.result);

  if (!req) {
    req = indexedDB.open('indexed', 1);

    req.onupgradeneeded = function(e) {
      var db = e.target.result;
      db.createObjectStore('store', { autoIncrement: false });
    };
  }

  function onerror(e) {
    req = null;
    cb(e.target.error);
  }

  req.addEventListener('blocked', onerror);
  req.addEventListener('error', onerror);
  req.addEventListener('success', function(e) {
    cb(null, e.target.result);
  });
}

function store(type, cb, fn) {
  getDb(function(err, db) {
    if (err) return cb(err);
    var mode = type == 'read' ? 'readonly' : 'readwrite';
    var tr = db.transaction(['store'], mode);

    tr.onerror = function(e) {
      cb(e.target.error);
    };
    tr.onabort = function(e) {
      cb(new Error('transaction ' + e.target.mode + ' aborted'));
    };

    fn(tr.objectStore('store'), tr);
  });
}

function commit(req, tr, cb) {
  request(req, function(err) {
    if (err) return cb(err);
    tr.oncomplete = function() { cb(null) };
  });
}
