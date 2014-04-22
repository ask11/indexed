var Emitter = require('emitter');
var type = require('type');
var each = require('each');
var request = require('idb-request');
var utils = require('./utils');
var Transaction = require('./transaction');
var Store = require('./store');
var assert = utils.assert;
var defineGetter = utils.defineGetter;
var prefix = utils.prefix;

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
  req.onblocked = function() { that.emit('blocked') };

  defineGetter(this, 'name', name);
  defineGetter(this, 'version', version);
  defineGetter(this, 'request', req);
  defineGetter(this, 'origin', function() { return req.result });
  defineGetter(this, 'error', function() { return req.error });

  if (cb) {
    this.once('success', function() { cb(null, that) });
    this.once('error', cb);
  }
}

/**
 * Mix `Emitter`.
 */

Emitter(DB.prototype);

/**
 * Destroy db by `name`
 *
 * @param {String} name
 * @param {Function} [cb]
 */

DB.destroy = function(name, cb) {
  var req = prefix('indexedDB').deleteDatabase(name);
  request(req, function(err) { err ? cb(err) : cb() });
};

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
  DB.destroy(this.name, cb);
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
