// setup indexeddb-shim
if (!window.indexedDB) {
  require('./vendor/indexeddb-shim');
  // window.shimIndexedDB.__debug(true);
}
