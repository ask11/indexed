var Indexed = require('./lib/index');
var IDBBackend = require('./lib/indexeddb');
var LSBackend = require('./lib/localstorage');

/**
 * When possible use IndexedDB as default backend,
 * and fallback to localStorage.
 */

IDBBackend.supported ? Indexed.use(IDBBackend) : Indexed.use(LSBackend);

/**
 * Expose `Indexed`.
 */

module.exports = Indexed;
