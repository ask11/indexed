var Emitter = require('emitter');
var type = require('type');
var each = require('each');
var utils = require('./utils');
var Transaction = require('./transaction');
var Store = require('./store');
var assert = utils.assert;
var defineGetter = utils.defineGetter;
var prefix = utils.prefix;
var listen = utils.listen;

/**
 * Expose `DB`.
 */

module.exports = DB;

/**
 * Initialize new `DB` instance.
 *
 * @param {String} name
 * @param {Number} [version]
 * @param {Function} [cb]
 */

function DB(name, version, cb) {
  if (!(this instanceof DB)) return new DB(name, version, cb);
  if (type(version) == 'function') {
    cb = version;
    version = 1;
  }
  assert(type(name) == 'string', '`name` is required');
  assert(version >= 1, 'version has to be >= 1');

  var req = prefix('indexedDB').open(name, version);
  var that = this;

  req.onsuccess = function() {
    var stores = {};
    each(that.origin.objectStoreNames, function(name) {
      stores[name] = new Store(name, that);
    });
    defineGetter(that, 'stores', stores);
    that.emit('success', that);
  };

  req.onupgradeneeded = function(e) { that.emit('upgradeneeded', e) };
  req.onerror = function() { that.emit('error', that.error) };
  req.onblocked = function() { that.emit('blocked', that.error) };

  defineGetter(this, 'name', name);
  defineGetter(this, 'version', version);
  defineGetter(this, 'request', req);
  defineGetter(this, 'origin', function() { return req.result });
  defineGetter(this, 'error', function() { return req.error });
  listen(this, cb, null, ['error', 'blocked' ]);
}

/**
 * Mix `Emitter`.
 */

Emitter(DB.prototype);

/**
 * Close db.
 */

DB.prototype.close = function() {
  this.origin.close();
};

/**
 * Destroy db.
 *
 * @param {Function} cb
 */

DB.prototype.destroy = function(cb) {
  this.close();
  var req = prefix('indexedDB').deleteDatabase(this.name);
  req.onsuccess = function() { cb() };
  req.onerror = function() { cb(req.error) };
};

/**
 * Get store by `name`.
 *
 * @param {String} name
 * @return {Store}
 */

DB.prototype.store = function(name) {
  assert(this.stores[name], 'Store with `%s` does not exist', name);
  return this.stores[name];
};

/**
 * Create read transaction.
 *
 * @param {Store|String} store
 * @return {Transaction}
 */

DB.prototype.read = function(store) {
  if (type(store) == 'string') store = this.store(store);
  return new Transaction(this, store, 'read');
};

/**
 * Create write transaction.
 *
 * @param {Store|String} store
 * @return {Transaction}
 */

DB.prototype.write = function(store) {
  if (type(store) == 'string') store = this.store(store);
  return new Transaction(this, store, 'write');
};
