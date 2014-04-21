var Emitter = require('emitter');
var assert = require('assert');
var request = request('idb-request');
var indexedDB = require('./indexeddb').indexedDB;
var defineGetter = require('./utils').defineGetter;

/**
 * Expose `DB`.
 */

module.exports = DB;

/**
 * Initialize new `DB` instance.
 *
 * @param {String} name
 * @param {Schema} schema
 * @param {Function} cb
 */

function DB(name, schema, cb) {
  if (!(this instanceof DB)) return new DB(name, schema);

  defineGetter(this, 'name', name);
  defineGetter(this, 'version', schema.currentVersion());
  defineGetter(this, 'stores', schema.createStores(this));

  var req = this._open(schema);
  defineGetter(this, 'request', req);
  defineGetter(this, 'origin', function() { return req.result });
  defineGetter(this, 'error', function() { return req.error });

  request(req, cb);
}

/**
 * Mixins.
 */

Emitter(DB.prototype);

/**
 * Close db.
 */

DB.prototype.close = function() {
  this.origin.close();
};

/**
 * Get store by `name`.
 *
 * @param {String} name
 * @return {Store}
 */

DB.prototype.store = function(name) {
  assert(this.stores[name], 'Store with `' + name + '` does not exist');
  return this.stores[name];
};

/**
 * Open db and apply `schema`.
 *
 * @param {Schema} schema
 * @return {IDBRequest}
 */

DB.prototype._open = function(schema) {
  var that = this;
  var req = indexedDB.open(this.name, this.version);

  req.addEventListener('success', function() {
    that.emit('success', that);
  });

  req.addEventListener('upgradeneeded', function(e) {
    schema.callback(e);
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
 * Destroy indexedDB by `name`.
 *
 * @param {String} name
 * @param {Function} cb
 */

DB.destroy = function(name, cb) {
  var req = indexedDB.destroyDatabase(name);
  request(req, cb);
};
