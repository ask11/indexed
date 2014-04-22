// setup indexeddb-shim
if (!window.indexedDB) {
  require('./vendor/indexeddb-shim');
  // window.shimIndexedDB.__debug(true);
}

var expect = require('chai').expect;
var indexed = require('../index');

describe('indexed/db', function() {
  var name;

  beforeEach(function() { name = 'library' + Date.now() });
  afterEach(function(done) { indexed.destroy(name, done) });

  it('open without schema', function(done) {
    indexed.open(name, function(err, db) {
      if (err) return done(err);
      expect(db.version).equal(1);
      db.destroy(done);
    });
  });

  it('has properties', function(done) {
    var schema = indexed.schema()
      .version(1).addStore('books')
      .version(2).addStore('magazins');
    var db = indexed(name, schema);

    db.on('error', done);
    db.on('success', function() {
      expect(db.name).equal(name);
      expect(db.version).equal(2);
      expect(db.request).exist; // origin IDBRequest used for open of db
      expect(db.origin).equal(db.request.result); // origin IDBDatabase instance
      expect(Object.keys(db.stores)).length(2);
      expect(db.error).not.exist;
      db.destroy(done);
    });
  });
});
