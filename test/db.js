var expect = require('chai').expect;
var indexed = require('../index');

describe('indexed/db', function() {
  if (!window.indexedDB) {
    require('./vendor/indexeddb-shim');
    // window.shimIndexedDB.__debug(true);
  }
  // generate new name each time
  var name;
  beforeEach(function() {
    name = 'library' + Date.now();
  });

  afterEach(function(done) {
    indexed.destroy(name, done);
  });

  it('open without version', function(done) {
    indexed.open(name, function(err, db) {
      if (err) return done(err);
      expect(db.version).equal(1);
      db.destroy(done);
    });
  });

  it('db object has properties', function(done) {
    var db = indexed(name, 2);

    db.on('upgradeneeded', function(e) {
      if (e.oldVersion < 1) db.origin.createObjectStore('books');
      if (e.oldVersion < 2) db.request.transaction.objectStore('books');
    });
    db.on('error', done);
    db.on('success', function() {
      expect(db.name).equal(name);
      expect(db.version).equal(2);
      expect(db.request).exist; // origin IDBRequest used for open of db
      expect(db.origin).equal(db.request.result); // origin IDBDatabase instance
      expect(Object.keys(db.stores)).length(1);
      expect(db.error).not.exist;
      db.destroy(done);
    });
  });
});
