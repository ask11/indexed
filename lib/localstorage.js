var nextTick = require('next-tick');
var unserialize = require('unserialize');
var Stream = require('stream');

/**
 * Expose `LSBackend` as `Indexed.Backend`.
 */

module.exports = exports = function(Indexed) {
  Indexed.Backend = LSBackend;
};

/**
 * Supports all browsers, which implements localStorage.
 */

exports.supported = !! localStorage;

/**
 * `LSBackend` construtor.
 * Wrap localStorage with async methods.
 *
 * @param {String} db
 * @param {String} name
 * @api public
 */

function LSBackend(db, name) {
  this.name = db + ':' + name;
}

/**
 * Drop all storage records, associated with `name`.
 *
 * @param {String} `name`
 * @param {function} cb
 * @api public
 */

LSBackend.dropDb = function(name, cb) {
  var fullName = name + ':';
  var keys = [];
  var error;

  try {
    for (var i = 0, len = localStorage.length, key; i < len; i++) {
      key = localStorage.key(i);
      if (key.indexOf(fullName) === 0) keys.push(key);
    }
    keys.forEach(function(key) { localStorage.removeItem(key) });
  } catch (err) { error = err }

  nextTick(function() { cb(error) });
};

/**
 * Get value by `key`.
 *
 * @param {String} key
 * @param {Function} cb
 * @api public
 */

LSBackend.prototype.get = function(key, cb) {
  this.async(cb, function() {
    return this.data()[key];
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
    data[key] = val;
    this.save(data);
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
    this.save(data);
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
    localStorage.removeItem(this.name);
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
        data[op.key] = op.value :
        delete data[op.key];
    });

    this.save(data);
  });
};

/**
 * Read all data from the store.
 * It gets all data and apply key filter, when `options` exist.
 *
 * @param {Object} options
 * @param {Function} transform
 * @return {Stream}
 * @api public
 */

LSBackend.prototype.createReadStream = function(options, transform) {
  var data = this.data();
  var stream = new Stream();
  stream.readable = true;

  nextTick(function() {
    try {
      var keys = Object.keys(data).sort(); // keys are sorted

      keys.forEach(function(key) {
        if (options.start && key < options.start) return;
        if (options.end && key > options.end) return;

        stream.emit('data', transform(key, data[key]));
      });

      stream.emit('end');
    } catch (err) {
      stream.emit('error', err);
    }
  });

  return stream;
};

/**
 * Get all data for this storage.
 *
 * @return {Object}
 * @api private
 */

LSBackend.prototype.data = function() {
  return unserialize(localStorage.getItem(this.name)) || Object.create(null);
};

/**
 * Stringify and save `data` to the storage.
 *
 * @param {Object} data
 * @api private
 */

LSBackend.prototype.save = function(data) {
  localStorage.setItem(this.name, JSON.stringify(data));
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
  nextTick(function() { cb(error, result) });
};
