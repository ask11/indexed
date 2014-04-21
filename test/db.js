var expect = require('chai').expect;
var indexed = require('../index');

describe('indexed/db', function() {
  it('open without version', function(done) {
    indexed.open('fake-library', function(err, db) {
      if (err) return done(err);

      expect(db.version).equal(1);
      db.destroy(done);
    });
  });

  it('db object has properties', function(done) {
    var db = indexed('library', 3);

    db.on('upgradeneeded', function(e) {
      // Version 1 is the first version of the database.
      if (e.oldVersion < 1) {
        var store = db.origin.createObjectStore('books', { keyPath: 'isbn' });
        store.createIndex('by_title', 'title', { unique: true });
        store.createIndex('by_author', 'author');

        // Populate with initial data.
        store.put({ title: 'Quarry Memories', author: 'Fred', isbn: 123456 });
        store.put({ title: 'Water Buffaloes', author: 'Fred', isbn: 234567 });
        store.put({ title: 'Bedrock Nights', author: 'Barney', isbn: 345678 });
      }

      // Version 2 introduces a new index of books by year.
      if (e.oldVersion < 2) {
        var bookStore = db.request.transaction.objectStore('books');
        bookStore.createIndex('by_year', 'year');
      }

      // Version 3 introduces a new object store for magazines with two indexes.
      if (e.oldVersion < 3) {
        var magazines = db.origin.createObjectStore('magazines');
        magazines.createIndex('by_publisher', 'publisher');
        magazines.createIndex('by_frequency', 'frequency');
      }
    });

    db.on('success', function() {
      expect(db.name).equal('library');
      expect(db.version).equal(3);
      expect(db.request).exist; // origin IDBRequest used for open of db
      expect(db.origin).equal(db.request.result); // origin IDBDatabase instance
      expect(db.error).null; // getter to db.request.error
      db.destroy(done);
    });
  });
});
