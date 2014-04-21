var defineGetter = require('./utils').defineGetter;

/**
 * Expose `Store`.
 */

module.exports = Store;

/**
 * Initialize new `Store` with `ops`.
 *
 * @param {String} name
 * @param {DB} db
 */

function Store(name, db) {
  var transaction = db.origin.transaction([name], 'readonly');
  var objectStore = transaction.objectStore(name);

  defineGetter(this, 'key', objectStore.keyPath);
  defineGetter(this, 'increment', objectStore.autoIncrement);
  defineGetter(this, 'name', name);
  defineGetter(this, 'db', db);

  transaction.abort(); // close transaction
}
