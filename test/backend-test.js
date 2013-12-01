function backendSpec(name, backend) {
  var indexed = require('indexed');
  var expect = require('chai').expect;
  var async = require('async');
  var notes;

  describe('Backend: '+ name, function() {
    indexed.use(backend);

    describe('get', function() {
      beforeEach(function(done) {
        notes = indexed('notepad:notes');
        async.parallel([
          function(cb) { notes.put('1', { name: 'note 1' }, cb); },
          function(cb) { notes.put('2', { name: 'note 2' }, cb); },
          function(cb) { notes.put('3', { name: 'note 3' }, cb); }
        ], done);
      });
      afterEach(function(done) { notes.clear(done) });

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
    });

    after(function(done) {
      indexed.dropDb('notepad', done);
    });
  });
}

backendSpec('IndexedDB', require('indexed/lib/indexed-db'));
// backendSpec('localStorage', require('indexed/lib/local-storage'));
