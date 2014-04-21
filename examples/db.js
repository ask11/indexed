var indexed = require('indexed');

// We can open db with defined schema
// and all necessary migrations will be run.
var db = indexed
  .open('library', 3, function() {
    console.log('db is ready');
  });

// properties
db.name; // library
db.version; // 3
db.stores; // [Store('books'), Store('magazines')]
db.origin; // origin IDBDatabase instance
db.request; // origin IDBRequest used for open of db
db.error; // getter to db.request.error

// listen to events
db.on('error', function(err) {
  console.log(err); // any error happen
});

db.on('blocked', function(err) {
  console.log(err); // db blocked, with db.error
});

db.on('success', function(db) {
  console.log('successfully connected to ', db); // with db
});

// pass custom callback to create schema
// http://www.w3.org/TR/IndexedDB/#introduction
// or use indexed-schema with convinient DSL
db.on('upgradeneeded', function(e) {
  e.oldVersion; // prev version
  e.newVersion; // new version
});

// after you finished to use db
// you can close connection
db.close();

// or delete database completely
db.destroy('library', function() {});
