var type = require('type');

/**
 * Expose `Indexed`.
 */

module.exports = Indexed;

/**
 * Construtor to wrap IndexedDB API with nice async methods.
 * `name` contains db-name and store-name splited with colon.
 *
 * Example:
 *
 *   // connect to db `notepad`, and use store `notes`.
 *   var notes = indexed('notepad:notes');
 *
 * @param {String} name
 * @param {Object} options
 * @api public
 */

function Indexed(name, options) {
  if (!(this instanceof Indexed)) return new Indexed(name, options);
  if (typeof name != 'string') throw new TypeError('`name` required');
  if (!options) options = {};
  name = name.split(':');

  this.backend = new Indexed.Backend(name[0], name[1]);
  this.options = options;
}

/**
 * Use the given plugin `fn(Indexed)`.
 *
 * @param {Function} fn
 * @return {Indexed}
 * @api public
 */

Indexed.use = function(fn) {
  fn(Indexed);
  return Indexed;
};

/**
 * Drop DB by `name`.
 *
 * @param {String} `name`
 * @param {function} cb
 * @api public
 */

Indexed.dropDb = function(name, cb) {
  if (typeof name != 'string') throw new TypeError('db `name` required');
  validateCallback(cb);
  Indexed.Backend.dropDb(name, cb);
};

/**
 * Get value by `key`.
 *
 * @param {Mixin} key
 * @param {Function} cb
 * @api public
 */

Indexed.prototype.get = function(key, cb) {
  validateCallback(cb);
  this.backend.get(stringifyKey(key), cb);
};

/**
 * Delete value by `key`.
 *
 * @param {Mixin} key
 * @param {Function} cb
 * @api public
 */

Indexed.prototype.del = function(key, cb) {
  validateCallback(cb);
  this.backend.del(stringifyKey(key), cb);
};

/**
 * Put - replace or create `val` by `key`.
 *
 * @param {Mixin} key
 * @param {Mixin} val
 * @param {Function} cb
 * @api public
 */

Indexed.prototype.put = function(key, val, cb) {
  validateCallback(cb);
  this.backend.put(stringifyKey(key), val, cb);
};

/**
 * Clear objects store.
 *
 * @param {Function} cb
 * @api public
 */

Indexed.prototype.clear = function(cb) {
  validateCallback(cb);
  this.backend.clear(cb);
};

/**
 * Batch put/del operations in one transaction.
 * `ops` has levelup semantic https://github.com/rvagg/node-levelup#batch.
 *
 * @param {Array} ops
 * @param {Function} cb
 * @api public
 */

Indexed.prototype.batch = function(ops, cb) {
  if (!Array.isArray(ops))
    throw new TypeError('`operations` must be an array');

  ops.forEach(function(op) {
    if (op.type != 'put' && op.type != 'del')
      throw new TypeError('not valid operation `type`: ' + op.type);
    if (op.type == 'put' && op.value === undefined)
      throw new TypeError('`value` is required for key ' + op.key);
    op.key = stringifyKey(op.key);
  });

  validateCallback(cb);
  this.backend.batch(ops, cb);
};

/**
 * Iterate each values in selected key range.
 *
 * Available options:
 *   - start: the key to start the read at
 *   - end: the end key
 *
 * Example:
 *   // filter values by key
 *   notes.createReadStream({ start: '1', end: '3' })
 *     .pipe(process.stdout);
 *
 * @param {Object} options
 * @return {ReadStream}
 * @api public
 */

Indexed.prototype.createReadStream = function(options) {
  if (!options) options = {};
  if (type(options) != 'object')
    throw new TypeError('`options` must be an object');

  if (options.start) options.start = stringifyKey(options.start);
  if (options.end) options.end = stringifyKey(options.end);

  return this.backend.createReadStream(options, function(key, val) {
    return { key: parseKey(key), value: val };
  });
};

/**
 * Returns all values.
 * It buffers results from `createReadStream` and returns in `cb`.
 *
 * @param {Function} cb
 * @api public
 */

Indexed.prototype.all = function(cb) {
  validateCallback(cb);

  var stream = this.createReadStream();
  var result = [];

  stream.on('error', cb);
  stream.on('data', function(data) { result.push(data) });
  stream.on('end', function() { cb(null, result) });
};

/**
 * Check `key` exists.
 *
 * @param {Mixin} key
 * @param {Function} cb
 * @api public
 */

Indexed.prototype.has = function(key, cb) {
  validateCallback(cb);
  this.get(key, function(err, val) { cb(err, !!val) });
};

/**
 * Returns size of the store.
 *
 * @param {Function} cb
 * @api public
 */

Indexed.prototype.count = function(cb) {
  validateCallback(cb);
  this.all(function(err, values) {
    err ? cb(err) : cb(null, values.length);
  });
};

/**
 * Classic way to iterate, on top of `createReadStream`.
 *
 * @param {Function} fn
 * @param {Function} cb
 * @api public
 */

Indexed.prototype.forEach = function(fn, cb) {
  validateCallback(cb);
  if (typeof fn != 'function')
    throw new TypeError('iterator function required');

  var stream = this.createReadStream();
  stream.on('error', cb);
  stream.on('end', cb);
  stream.on('data', fn);
};

/**
 * Use IndexedDb and localStorage as default backends.
 */

var IDB = require('./indexeddb');
IDB.supported ? Indexed.use(IDB) : Indexed.use(require('./localstorage'));

/**
 * Helper to convert key of supported type to string.
 * It uses '$' to separate real strings from another valid json values.
 * Indexed uses only simple, comparable types for keys, like:
 * string, number, boolean and null.
 *
 * @param {String} key
 * @api private
 */

function stringifyKey(key) {
  switch (type(key)) {
    case 'string': return '$' + key;
    case 'number':
    case 'boolean':
    case 'null': return JSON.stringify(key);
    default: throw new TypeError('not valid key type');
  }
}

/**
 * Mirror for `stringifyKey`.
 * Converts string key back to comparable value.
 *
 * @param {String} key
 * @api private
 */

function parseKey(key) {
  return key.charAt(0) == '$' ? key.substr(1) : JSON.parse(key);
}

/**
 * Helper to validate callback. Callback is always a last argument,
 * so we validate that previous arguments exist.
 * Key type validates with `stringifyKey` and value has any type.
 *
 * @param {Function} cb
 * @api private
 */

function validateCallback(cb) {
  if (typeof cb != 'function') throw new TypeError('`callback` required');
}
