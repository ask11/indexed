var type = require('type');
var max = require('max');
var extend = require('extend');
var each = require('each');
var Store = require('./store');
var utils = require('./utils');
var assert = utils.assert;

/**
 * Expose `Schema`.
 */

module.exports = Schema;

/**
 * Initialize new `Schema`.
 */

function Schema() {
  if (!(this instanceof Schema)) return new Schema();
  this._versions = {};
  this._current = null;
  this.version(1); // set default version
}

/**
 * Define new version.
 *
 * @param {Number} version
 * @return {Schema}
 */

Schema.prototype.version = function(version) {
  assert(type(version) == 'number' && version >= 1, 'not valid version');
  this._versions[version] = { stores: {} };
  this._current = { version: version, store: null };
  return this;
};

/**
 * Add new store.
 *
 * @param {String} name
 * @param {Object} ops { key, increment }
 */

Schema.prototype.addStore = function(name, ops) {
  if (!ops) ops = {};
  ops = extend({ key: false, increment: false, values: [] }, ops);
  this._versions[this._current.version].stores[name] = ops;
  this._current.store = name;
  return this;
};

/**
 * Put `val` to current store.
 *
 * @param {Object} val
 * @return {Schema}
 */

Schema.prototype.put = function(val) {
  assert(this._current.store, 'store is not selected');
  var store = this._versions[this._current.version].stores[this._current.store];
  store.values.push(val);
  return this;
};

/**
 * Get schema version.
 *
 * @return {Number}
 */

Schema.prototype.getVersion = function() {
  return parseInt(max(Object.keys(this._versions)), 10);
};

/**
 * Create stores for `db`.
 *
 * @param {DB} db
 * @return {Object}
 */

Schema.prototype.createStores = function(db) {
  var stores = {};

  each(this._versions, function(version, val) {
    each(val.stores, function(name, ops) {
      stores[name] = new Store(name, db, ops);
    });
  });

  return stores;
};

/**
 * Generate callback for `upgradeneeded`.
 *
 * @return {Function}
 */

Schema.prototype.callback = function() {
  return function(e) {
    var db = e.target.result;
    if (e.oldVersion < 1) {
      var store = db.createObjectStore('books', { keyPath: 'isbn' });
      // Populate with initial data.
      store.put({ title: 'Quarry Memories', author: 'Fred', isbn: 123456 });
      store.put({ title: 'Water Buffaloes', author: 'Fred', isbn: 234567 });
      store.put({ title: 'Bedrock Nights', author: 'Barney', isbn: 345678 });
    }
    if (e.oldVersion < 2) db.createObjectStore('magazines');
  };
};
