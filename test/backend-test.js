function backendSpec(name, backend) {
  var indexed = require('indexed').use(backend);
  var expect = require('chai').expect;
  var async = require('async');

  describe('Backend: '+ name, function() {
    before(function(done) {
      indexed.dropDb('notepad', done);
    });

    describe('get', function() {
      var notes;

      beforeEach(function(done) {
        notes = indexed('notepad:notes');
        notes.batch([
          { type: 'put', key: '1', value: { name: 'note 1' } },
          { type: 'put', key: '2', value: { name: 'note 2' } },
          { type: 'put', key: 'foo', value: 123 },
          { type: 'put', key: 'bar', value: [1, 2, 3, 4] },
          { type: 'put', key: 'baz', value: null },
        ], done);
      });

      afterEach(function(done) {
        notes.clear(done);
      });

      it('returns one value', function(done) {
        notes.get('2', function(err, note) {
          expect(Object.keys(note)).length(1);
          expect(note.name).equal('note 2');
          done(err);
        });
      });

      it('returns undefined when key is not found', function(done) {
        notes.get('5', function(err, note) {
          expect(note).undefined;
          done(err);
        });
      });

      it('returns data in original format', function(done) {
        async.parallel([
          function(cb) { notes.get('foo', cb) },
          function(cb) { notes.get('bar', cb) },
          function(cb) { notes.get('baz', cb) },
        ], function(err, result) {
          expect(result[0]).equal(123);
          expect(result[1]).eql([1, 2, 3, 4]);
          expect(result[2]).equal(null);
          done(err);
        });
      });
    });
  });
}

// backendSpec('IndexedDB', require('indexed/lib/indexed-db'));
backendSpec('localStorage', require('indexed/lib/local-storage'));
