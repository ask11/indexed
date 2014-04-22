var Emitter = require('emitter');
var type = require('type');
var request = require('idb-request');
var Schema = require('./schema');
var Transaction = require('./transaction');
var utils = require('./utils');
var assert = utils.assert;
var defineGetter = utils.defineGetter;
var indexedDB = utils.indexedDB;

/**
 * Expose `DB`.
 */

module.exports = DB;

/**
 * Initialize new `DB` instance.
 *
 * @param {String} name
 * @param {Schema} [schema]
 * @param {Function} [cb]
 */

function DB(name, schema, cb) {
  if (!(this instanceof DB)) return new DB(name, schema, cb);
  assert(type(name) == 'string', '`name` is required');
  if (type(schema) == 'function') {
    cb = schema;
    schema = new Schema();
  }

  var req = indexedDB.open(name, schema.getVersion());
  var callback = schema.callback();
  var that = this;

  req.onupgradeneeded = function(e) {
    callback(e);
    that.emit('upgradeneeded', e);
  };
  req.onerror = function() { that.emit('error', that.error) };
  req.onblocked = function() { that.emit('blocked') };
  req.onsuccess = function() { that.emit('success', that) };

  defineGetter(this, 'name', name);
  defineGetter(this, 'version', schema.getVersion());
  defineGetter(this, 'stores', schema.createStores(this));
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
  var req = indexedDB.deleteDatabase(name);
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
  assert(this.stores[name], 'Store `%s` does not exist', name);
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
