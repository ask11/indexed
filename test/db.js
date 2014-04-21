var expect = require('chai').expect;
var indexed = require('../index');

describe('indexed/db', function() {
  var db;
  var schema = indexed.schema()
    .version(1)
      .addStore('books', { keyPath: 'isbn' }) // use isbn as a key
      .addIndex('byTitle', 'title', { unique: true }) // unique index
      .addIndex('byAuthor', 'author')
      .put({ title: 'Quarry Memories', author: 'Fred', isbn: 123456 })
      .put({ title: 'Water Buffaloes', author: 'Fred', isbn: 234567 })
      .put({ title: 'Bedrock Nights', author: 'Barney', isbn: 345678 })
    .version(2) // alter existins store
      .getStore('books')
      .addIndex('byYear', 'year')
    .version(3) // create new store with 2 indexes
      .addStore('magazines')
      .addIndex('byPublisher', 'publisher')
      .addIndex('byFrequency', 'frequency');

  beforeEach(function(done) {
    db = indexed.open('library', schema, done);
  });

  afterEach(function(done) {
    indexed.destroy('library', done);
  });

  it('db object has properties', function() {
    expect(db.name).equal('library');
    expect(db.version).equal(3);
    expect(db.stores).length(2); // [Store('books'), Store('magazines')]
    expect(db.origin).exist; // origin IDBDatabase instance
    expect(db.request).exist; // origin IDBRequest used for open of db
    expect(db.error).not.exist; // getter to db.request.error
  });
});
