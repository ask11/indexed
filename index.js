var Indexed = require('./lib/index');

/**
 * Use build in plugins.
 */

Indexed.use(require('./lib/localstorage'));
Indexed.use(require('./lib/indexeddb'));
Indexed.use(require('./lib/promises'));

/**
 * Expose `Indexed`.
 */

module.exports = Indexed;
