var nextTick = require('next-tick');
var each = require('each');
var Stream = require('stream');

/**
 * Expose `LSBackend` as `Indexed.Backend`.
 */

module.exports = function(Indexed) {
  Indexed.Backend = LSBackend;
};

/**
 * `LSBackend` construtor.
 * Wrap localStorage with async methods.
 *
 * @param {String} db
 * @param {String} name
 * @api public
 */

function LSBackend(db, name) {
  this.db = db;
  this.name = name;
}

/**
 * Drop all storage records, associated with `name`.
 *
 * @param {String} `name`
 * @param {function} cb
 * @api public
 */

LSBackend.dropDb = function(name, cb) {
  var fullName = name + ':', error;
  try {
    for (var i = 0, len = localStorage.length, key; i < len; i++) {
      key = localStorage.key(i);
      if (key.indexOf(fullName) === 0) localStorage.removeItem(key);
    }
  } catch (err) { error = err }

  nextTick(function() { cb(error) });
};

/**
 * Supports all browsers, implemented localStorage.
 *
 * @api public
 */

LSBackend.supported = !! localStorage;

/**
 * Get value by `key`.
 *
 * @param {String} key
 * @param {Function} cb
 * @api public
 */

LSBackend.prototype.get = function(key, cb) {
  this.async(cb, function() {
    var val = this.data()[key];
    if (val) return JSON.parse(val);
  });
};

/**
 * Replace or create `val` by `key`.
 *
 * @param {Mixin} key
 * @param {Mixin} val
 * @param {Function} cb
 * @api public
 */

LSBackend.prototype.put = function(key, val, cb) {
  this.async(cb, function() {
    var data = this.data();
    data[key] = JSON.stringify(val);
    localStorage.setItem(this.name(), data);
  });
};

/**
 * Delete value by `key`.
 *
 * @param {Mixin} key
 * @param {Function} cb
 * @api public
 */

LSBackend.prototype.del = function(key, cb) {
  this.async(cb, function() {
    var data = this.data();
    if (!data[key]) return;
    delete data[key];
    localStorage.setItem(this.name(), data);
  });
};

/**
 * Clear store.
 *
 * @param {Function} cb
 * @api public
 */

LSBackend.prototype.clear = function(cb) {
  this.async(cb, function() {
    localStorage.removeItem(this.name());
  });
};

/**
 * Batch async put/del operations `ops` in one transaction.
 *
 * @param {Array} ops
 * @param {Function} cb
 * @api public
 */

LSBackend.prototype.batch = function(ops, cb) {
  this.async(cb, function() {
    var data = this.data();

    ops.forEach(function(op) {
      op.type == 'put' ?
        data[op.key] = JSON.stringify(op.value) :
        delete data[op.key];
    });

    localStorage.setItem(this.name(), data);
  });
};

/**
 * Read data from the store for selected `range`.
 * It gets all data and apply filter.
 *
 * @param {Object} range
 * @param {Function} transform
 * @return {Stream}
 * @api public
 */

LSBackend.prototype.createReadStream = function(range, transform) {
  var stream = new Stream();
  stream.readable = true;

  nextTick(function() {
    try {
      each(this.data(), function(key, value) {
        stream.emit('data', transform(key, value));
      });
      stream.emit('end');
    } catch (err) {
      stream.emit('error', err);
    }
  });

  return stream;
};

/**
 * Returns storage namespace.
 *
 * @return {String}
 * @api private
 */

LSBackend.prototype.name = function() {
  return this.db + ':' + this.name;
};

/**
 * Get all data for this storage.
 *
 * @return {Object}
 * @api private
 */

LSBackend.prototype.data = function() {
  return localStorage.getItem(this.name()) || Object.create(null);
};

/**
 * Helper to emulate async call.
 * It uses `cb` to handle errors and result of action function `fn`.
 *
 * @param {Function} cb
 * @param {Function} fn
 * @api private
 */

LSBackend.prototype.async = function(cb, fn) {
  var error, result;
  try {
    result = fn.call(this);
  } catch (err) { error = err }

  nextTick(function() { result ? cb(error) : cb(error, result) });
};
