var db = require('./db');

// indexed `Store` object creates readwrite/readonly transactions automatically
// based on first command, but you can specify it manually, in IndexedDB style.
db.write('books'); // write transaction to `books` store
db.read('magazines'); // read transaction to `magazines` store

// handle error
var tr = db.write('books')
  .put({ title: 'Water Buffaloes', author: 'Slate', isbn: 987654 })
  .then(null, onerror); // tr.error

// use events
tr.on('error', onerror);

tr.on('abort', function() {
  // someone called db.abort()
});

tr.on('complete', function() {
  // all is fine
});

// properties
tr.origin; // origin
tr.db; // link to db
tr.mode; // getter to tr.origin.mode
tr.store; // accesible store
tr.active; // true|false
tr.error; // if any error happen
