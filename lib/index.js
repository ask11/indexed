var LocalSet = require('set');
var type = require('type');

/**
 * Local variables.
 */

var plugins = new LocalSet();

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
 */

Indexed.use = function(fn) {
  if (!plugins.has(fn)) {
    plugins.add(fn);
    fn(Indexed);
  }
  return Indexed;
};

/**
 * Get value by `key`.
 *
 * @param {Mixin} key
 * @param {Function} cb
 */

Indexed.prototype.get = function(key, cb) {
  validateCallback({ key: key, cb: cb });
  this.backend.get(stringifyKey(key), cb);
};

/**
 * Delete value by `key`.
 *
 * @param {Mixin} key
 * @param {Function} cb
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
 */

Indexed.prototype.put = function(key, val, cb) {
  validateCallback(cb);
  this.backend.put(stringifyKey(key), val, cb);
};

/**
 * Clear objects store.
 *
 * @param {Function} cb
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
 */

Indexed.prototype.batch = function(ops, cb) {
  if (!Array.isArray(ops))
    throw new TypeError('`operations` must be an array');

  validateCallback(cb);
  this.backend.batch(ops, cb);
};

/**
 * Iterate each values in selected range.
 * It accepts gt, gte, lw, lwe, and value for equal meaning.
 *
 * Example:
 *
 *   // select values, where: 2 ≤ foo < 5 && bar = 4
 *   notes.createReadStream({ foo: { gte: 2, lw: 5 }, bar: 4 })
 *     .pipe(console.log.bind(console));
 *
 * @param {Object} range
 * @return {ReadStream}
 */

Indexed.prototype.createReadStream = function(range) {
  if (!range) range = {};
  if (type(range) != 'object')
    throw new TypeError('`range` must be an object');

  return this.backend.createReadStream(range, function(key, val) {
    return { key: parseKey(key), value: val };
  });
};

/**
 * Query data from the store.
 * It buffers results from `this.createReadStream` and returns in `cb`.
 *
 * @param {Object} range
 * @param {Function} cb
 */

Indexed.prototype.query = function(range, cb) {
  validateCallback(cb);

  var stream = this.createReadStream(range);
  var result = [];

  stream.on('error', cb);
  stream.on('data', result.push.bind(result));
  stream.on('end', function() { cb(null, result) });
  stream.on('close', function() { cb(null, result) });
};

/**
 * Use IndexedDb and localStorage as default backends.
 */

Indexed
  .use(require('./indexed-db'))
  .use(require('./local-storage'));

/**
 * Helper to convert key of supported type to string.
 * It uses '$' to separate real strings from another valid json values.
 * Indexed uses only simple, comparable types for keys, like:
 * string, number, boolean and null.
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
 */

function parseKey(key) {
  return key.charAt(0) == '$' ? key.substr(1) : JSON.parse(key);
}

/**
 * Helper to validate callback. Callback is always a last argument,
 * so we validate that previous arguments exist.
 * Key type validates with `stringifyKey` and value has any type.
 */

function validateCallback(cb) {
  if (type(cb) != 'function') throw new TypeError('`callback` required');
}
