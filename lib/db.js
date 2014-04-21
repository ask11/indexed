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
  assert(type(name) == 'string', '`name` is required');
  defineGetter(this, 'name', name);

  var req = this.open(version);
  var that = this;

  defineGetter(this, 'request', req);
  defineGetter(this, 'version', function() { return version || req.result.version });
  defineGetter(this, 'origin', function() { return req.result });
  defineGetter(this, 'error', function() { return req.error });

  if (cb) request(req, function(err) { cb(err, that) });
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
 * Open db and apply `schema`.
 *
 * @param {String} version
 * @return {IDBRequest}
 * @api private
 */

DB.prototype.open = function(version) {
  var that = this;
  var req = version
    ? indexedDB.open(this.name, version)
    : indexedDB.open(this.name);

  req.addEventListener('success', function() {
    var stores = {};

    each(that.origin.objectStoreNames, function(name) {
      stores[name] = new Store(name, that);
    });

    defineGetter(that, 'stores', stores);
    that.emit('success', that);
  });

  req.addEventListener('upgradeneeded', function(e) {
    that.emit('upgradeneeded', e);
  });

  req.addEventListener('error', function() {
    that.emit('error', that.error);
  });

  req.addEventListener('blocked', function() {
    that.emit('blocked');
  });

  return req;
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
