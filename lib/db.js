var Emitter = require('emitter');
var request = require('idb-request');
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
 * @param {Number} version
 * @param {Function} cb
 */

function DB(name, version, cb) {
  defineGetter(this, 'name', name);
  var req = this.open(version);

  defineGetter(this, 'request', req);
  defineGetter(this, 'version', function() { return version || req.result.version });
  defineGetter(this, 'origin', function() { return req.result });
  defineGetter(this, 'error', function() { return req.error });
  defineGetter(this, 'stores', [1, 2]); // fake

  if (cb) request(req, cb);
}

/**
 * Mixins.
 */

Emitter(DB.prototype);

/**
 * Destroy indexedDB by `name`.
 *
 * @param {String} name
 * @param {Function} cb
 */

DB.destroy = function(name, cb) {
  var req = indexedDB.deleteDatabase(name);
  request(req, cb);
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
  DB.destroy(this.name, cb);
};

/**
 * Get store by `name`.
 *
 * @param {String} name
 * @return {Store}
 */

DB.prototype.store = function(name) {
  if(!this.stores[name])
    throw new TypeError('Store with `' + name + '` does not exist');
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
