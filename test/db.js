var expect = require('chai').expect;
var indexed = require('../index');

describe('indexed/db', function() {
  if (!window.indexedDB) require('./vendor/indexeddb-shim');

  it('open without version', function(done) {
    indexed.open('fake-library', function(err, db) {
      if (err) return done(err);

      expect(db.version).equal(1);
      db.destroy(done);
    });
  });

  it('db object has properties', function(done) {
    var db = indexed('library', 2);

    db.on('upgradeneeded', function(e) {
      // Version 1 is the first version of the database.
      if (e.oldVersion < 1) {
        db.origin.createObjectStore('books');
      }

      // Version 2 introduces a new index of books by year.
      if (e.oldVersion < 2) {
        var bookStore = db.request.transaction.objectStore('books');
        bookStore.createIndex('by_year', 'year');
      }
    });

    db.on('success', function() {
      expect(db.name).equal('library');
      expect(db.version).equal(2);
      expect(db.request).exist; // origin IDBRequest used for open of db
      expect(db.origin).equal(db.request.result); // origin IDBDatabase instance
      expect(db.error).null; // getter to db.request.error
      db.destroy(done);
    });
  });
});
