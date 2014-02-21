var indexed = require('indexed');
var schema = require('./schema');

// We can open db with defined schema
// and all necessary migrations will be run.
var db = indexed
  .open('library', schema) // pass db name, and schema
  .then(function() {
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

// Pass standart IndexedDB event
// you can use it, if you don't like schema DSL.
db.on('upgradeneeded', function(e) {
  e.oldVersion; // prev version
  e.newVersion; // new version
});

// Expose db connection for another modules
module.exports = db;

// after you finished to use db
// you can close connection
db.close();

// or delete database completely
indexed.destroy('library')
  .then(function() {});
