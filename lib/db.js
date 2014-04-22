var Emitter = require('emitter');
var request = require('idb-request');
var type = require('type');
var each = require('each');
var indexedDB = require('./indexeddb').indexedDB;
var utils = require('./utils');
var assert = utils.assert;
var defineGetter = utils.defineGetter;
var Transaction = require('./transaction');
var Store = require('./store');

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

  var req = indexedDB.open(name, version);
  var that = this;

  req.addEventListener('success', function() {
    var stores = {};
    each(that.origin.objectStoreNames, function(name) {
      stores[name] = new Store(name, that);
    });
    defineGetter(that, 'stores', stores);
    that.emit('success', that);
  });

  req.addEventListener('upgradeneeded', function(e) { that.emit('upgradeneeded', e) });
  req.addEventListener('error', function() { that.emit('error', that.error) });
  req.addEventListener('blocked', function() { that.emit('blocked') });

  defineGetter(this, 'name', name);
  defineGetter(this, 'version', version);
  defineGetter(this, 'request', req);
  defineGetter(this, 'origin', function() { return req.result });
  defineGetter(this, 'error', function() { return req.error });

  if (cb) request(req, function() { cb(that.error, that) });
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
  var req = indexedDB.deleteDatabase(this.name);
  request(req, function(err) { cb(err) });
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
