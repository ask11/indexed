var expect = require('chai').expect;
var indexed = require('../index');

describe('indexed/store', function() {
  var db;

  beforeEach(function(done) {
    db = indexed('library', 3, done);
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

      // Version 3 introduces a new object store for magazines with two indexes.
      if (e.oldVersion < 2) {
        var magazines = db.origin.createObjectStore('magazines');
        magazines.createIndex('by_publisher', 'publisher');
        magazines.createIndex('by_frequency', 'frequency');
      }
    });
  });

  afterEach(function(done) {
    db.destroy(done);
  });

  it('db.stores', function() {
    expect(Object.keys(db.stores)).length(2);
  });

  it('has properties', function() {
    var books = db.store('books');

    expect(books.name).equal('books');
    expect(books.db).equal(db);
    expect(books.key).equal('isbn');
    expect(books.increment).false;
  });

  it('#get', function(done) {
    var books = db.store('books');

    books.get(234567, function(err, book) {
      expect(book).exist;
      expect(book).eql({ title: 'Water Buffaloes', author: 'Fred', isbn: 234567 });
      done(err);
    });
  });

  it('#put', function(done) {
    var books = db.store('books');
    var data = { title: 'Sleeping yaks', author: 'John', isbn: 456789 };

    books.put(data, function(err) {
      books.get(456789, function(err2, book) {
        expect(book).exist;
        expect(book).eql(data);
        done(err || err2);
      });
    });
  });

  it('#del', function(done) {
    var books = db.store('books');

    books.del(123456, function(err) {
      books.get(123456, function(err2, book) {
        expect(book).not.exist;
        done(err || err2);
      });
    });
  });

  it('#count', function(done) {
    var books = db.store('books');
    var magazines = db.store('magazines');

    books.count(function(err, count) {
      expect(count).equal(3);
      magazines.count(function(err2, count) {
        expect(count).equal(0);
        done(err || err2);
      });
    });
  });

  it('#clear', function(done) {
    var books = db.store('books');

    books.clear(function(err) {
      books.count(function(err2, count) {
        expect(count).equal(0);
        done(err || err2);
      });
    });
  });
});
