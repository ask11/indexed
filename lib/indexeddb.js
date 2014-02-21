
/**
 * indexedDB reference.
 */

exports.indexedDB = window.indexedDB
  || window.mozIndexedDB
  || window.webkitIndexedDB;

/**
 * IDBKeyRange reference.
 */

exports.IDBKeyRange = window.IDBKeyRange
  || window.mozIDBKeyRange
  || window.webkitIDBKeyRange;
