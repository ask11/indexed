var expect = require('chai').expect;
var indexed = require('../index');

describe('indexed/db', function() {
  var db;

  beforeEach(function(done) {
    db = indexed('library', 3, done);
    db.on('upgradeneeded', function(e) {
      // Version 1 is the first version of the database.
      if (e.oldVersion < 1) {
        var store = db.origin.createObjectStore('books', { keyPath: 'isbn' });
        store.createIndex('by_title', 'title', { unique: true });
        store.createIndex('by_author', 'author');
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
  });

  afterEach(function(done) {
    db.destroy(done);
  });

  it('db object has properties', function() {
    expect(db.name).equal('library');
    expect(db.version).equal(3);
    expect(db.request).exist; // origin IDBRequest used for open of db
    expect(db.origin).equal(db.request.result); // origin IDBDatabase instance
    expect(db.error).null; // getter to db.request.error
  });
});
