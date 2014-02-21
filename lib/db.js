var indexedDB = require('./indexeddb').indexedDB;
var Emitter = require('emitter');
var Plugins = require('./plugins');

/**
 * Expose `DB`.
 */

module.exports = DB;

/**
 * Initialize new `DB` instance.
 *
 * @param {String} name
 * @param {Schema} schema
 */

function DB(name, schema) {
  if (!(this instanceof DB)) return new DB(name, schema);
  this.defineGetter('name', name);
  this.defineGetter('version', schema.currentVersion());
  this.defineGetter('stores', schema.createStores(this));

  var req = this._open(schema);
  this.defineGetter('request', req);
  this.defineGetter('origin', function() { return req.result });
  this.defineGetter('error', function() { return req.error });
}

/**
 * Mixins.
 */

Emitter(DB.prototype);
Plugins(DB.prototype);

/**
 * Close db.
 */

DB.prototype.close = function() {
  this.origin.close();
};

/**
 * Use a `plugin` function.
 *
 * @param {Function} plugin
 * @return {DB}
 */

DB.prototype.use = function(plugin) {
  plugin(this);
  return this;
};

/**
 * Get store by `name`.
 *
 * @param {String} name
 * @return {Store}
 */

DB.prototype.store = function(name) {
  if (!this.stores[name])
    throw new TypeError('Store with ' + name + ' does not exist');

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

  this.defineThenAsListener('success', ['error', 'blocked']);
  return req;
};
