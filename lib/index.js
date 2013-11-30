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
  if (typeof name != 'string') throw new TypeError('name required');
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
  this.backend.get(prepareKey(key), cb);
};

/**
 * Delete value by `key`.
 *
 * @param {Mixin} key
 * @param {Function} cb
 */

Indexed.prototype.del = function(key, cb) {
  validateCallback(cb);
  this.backend.del(prepareKey(key), cb);
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
  this.backend.put(prepareKey(key), val, cb);
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
 * Use IndexedDb and localStorage as default backends.
 */

Indexed
  .use(require('./indexed-db'))
  .use(require('./local-storage'));

/**
 * Helper to convert key of supported type to string.
 * It uses '$' to separate real strings from
 * numbers, dates and etc, converted to string.
 */

function prepareKey(key) {
  switch (type(key)) {
    case 'string': return '$' + key;
    case 'number':
    case 'date':
    case 'regexp':
    case 'boolean':
    case 'null':
    case 'undefined': return '' + key;
    default: throw new TypeError('not valid key type');
  }
}

/**
 * Helper to validate callback. Callback is always a last argument,
 * so we validate that previous arguments exist.
 * Key type validates with `prepareKey` and value has any type.
 */

function validateCallback(cb) {
  if (type(cb) != 'function') throw new TypeError('callback required');
}
