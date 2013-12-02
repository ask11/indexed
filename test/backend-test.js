function backendSpec(name, backend) {
  var indexed = require('indexed');
  var expect = require('chai').expect;
  var notes;

  describe('Backend: '+ name, function() {
    indexed.use(backend);
    before(function(done) {
      indexed.dropDb('notepad', done);
    });

    describe('get', function() {
      beforeEach(function(done) {
        notes = indexed('notepad:notes');
        notes.batch([
          { type: 'put', key: '1', value: { name: 'note 1' } },
          { type: 'put', key: '2', value: { name: 'note 2' } },
          { type: 'put', key: '3', value: { name: 'note 3' } },
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
  });
}

// backendSpec('IndexedDB', require('indexed/lib/indexed-db'));
backendSpec('localStorage', require('indexed/lib/local-storage'));
