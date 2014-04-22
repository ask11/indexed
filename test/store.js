var expect = require('chai').expect;
var indexed = require('../index');

describe('indexed/store', function() {
  var name, db;
  var schema = window.sc = indexed.schema()
    .version(1)
      .addStore('books', { key: 'isbn' })
      .put({ title: 'Quarry Memories', author: 'Fred', isbn: 123456 })
      .put({ title: 'Water Buffaloes', author: 'Fred', isbn: 234567 })
      .put({ title: 'Bedrock Nights', author: 'Barney', isbn: 345678 })
    .version(2)
      .addStore('magazines');

  beforeEach(function(done) {
    name = 'library' + Date.now();
    db = indexed(name, schema, done);
  });

  afterEach(function(done) {
    db.close();
    indexed.destroy(name, done);
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