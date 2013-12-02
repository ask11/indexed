function backendSpec(name, backend) {
  var indexed = require('indexed');
  var expect = require('chai').expect;
  var async = require('async');

  describe('Backend: '+ name, function() {
    before(function() {
      indexed.use(backend);
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
        indexed.dropDb('notepad', done);
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
          expect(result[2]).null;
          done(err);
        });
      });

      it('allows parallel reading', function(done) {
        var tags = indexed('notepad:tags');
        tags.batch([
          { type: 'put', key: '1', value: { name: 'tag 1' } },
          { type: 'put', key: '2', value: { name: 'tag 2' } },
        ], function(err) {
          async.parallel([
            function(cb) { notes.get('1', cb) },
            function(cb) { tags.get('1', cb) },
            function(cb) { notes.get('baz', cb) },
          ], function(err2, result) {
            expect(result[0]).eql({ name: 'note 1' });
            expect(result[1]).eql({ name: 'tag 1' });
            expect(result[2]).null;
            done(err || err2);
          });
        });
      });
    });

    describe('put', function() {
      afterEach(function(done) {
        indexed.dropDb('notepad', done);
      });

      it('put one value', function(done) {
        var tags = indexed('notepad:tags');

        tags.put('foo', 'bar', function(err) {
          tags.get('foo', function(err2, tag) {
            expect(tag).equal('bar');
            done(err || err2);
          });
        });
      });

      it('replace existing value', function(done) {
        var notes = indexed('notepad:notes');

        async.series([
          function(cb) { notes.get('foo', cb) },
          function(cb) { notes.put('foo', { value: 'bar', sub: 'baz' }, cb) },
          function(cb) { notes.get('foo', cb) },
          function(cb) { notes.put('foo', { value: 'baz' }, cb) },
          function(cb) { notes.get('foo', cb) },
        ], function(err, result) {
          expect(result[0]).undefined;
          expect(result[2]).eql({ value: 'bar', sub: 'baz' });
          expect(result[4]).eql({ value: 'baz' });
          done(err);
        });
      });

      it('allows parallel writing', function(done) {
        var notebooks = indexed('notepad:notebooks');
        var tags = indexed('notepad:tags');

        async.parallel([
          function(cb) { notebooks.put('foo', { value: 1 }, cb) },
          function(cb) { tags.put('foo', { value: 'bar', sub: 'baz' }, cb) },
          function(cb) { tags.put('2', true, cb) },
          function(cb) { notebooks.put('3', false, cb) },
          function(cb) { tags.put('3', 'foobar', cb) },
        ], function(err) {
          async.parallel([
            function(cb) { notebooks.get('foo', cb) },
            function(cb) { tags.get('foo', cb) },
            function(cb) { tags.get('2', cb) },
            function(cb) { notebooks.get('3', cb) },
            function(cb) { tags.get('3', cb) },
          ], function(err2, result) {
            expect(result[0]).eql({ value: 1 });
            expect(result[1]).eql({ value: 'bar', sub: 'baz' });
            expect(result[2]).true;
            expect(result[3]).false;
            expect(result[4]).equal('foobar');
            done(err || err2);
          });
        });
      });

      it.skip('adds only one value on each put', function(done) {
        var notebooks = indexed('notepad:notebooks');
        async.series([
          function(cb) { notebooks.put('1', { name: 'notebook 1' }, cb) },
          function(cb) { notebooks.put('2', { name: 'notebook 2' }, cb) },
          function(cb) { notebooks.put('1', { name: '1' }, cb) },
        ], function(err) {
          notebooks.query({}, function(err2, values) {
            expect(values).length(2);
            done(err || err2);
          });
        });
      });
    });

    describe('del', function() {
      var scripts;

      beforeEach(function(done) {
        scripts = indexed('writer:scripts');
        scripts.batch([
          { type: 'put', key: 'iusyn9ds2', value: { name: 'note 1' } },
          { type: 'put', key: 'io89UYbxq', value: { name: 'note 2' } },
          { type: 'put', key: 'op8Uj7hx0', value: { name: 'note 3' } },
        ], done);
      });

      afterEach(function(done) {
        indexed.dropDb('writer', done);
      });

      it('removes one value', function(done) {
        async.series([
          function(cb) { scripts.get('io89UYbxq', cb) },
          function(cb) { scripts.del('io89UYbxq', cb) },
          function(cb) { scripts.get('io89UYbxq', cb) },
        ], function(err, result) {
          expect(result[0]).eql({ name: 'note 2' });
          expect(result[2]).undefined;
          done(err);
        });
      });

      it.skip('allows parallel remove', function(done) {
        async.parallel([
          function(cb) { scripts.del('iusyn9ds2', cb) },
          function(cb) { scripts.del('io89UYbxq', cb) },
          function(cb) { scripts.del('op8Uj7hx0', cb) },
        ], function(err) {
          scripts.query({}, function(err2, values) {
            expect(values).length(0);
            done(err || err2);
          });
        });
      });

      it.skip('does nothing when value is not found', function(done) {
        scripts.del('fake-key', function(err) {
          scripts.query({}, function(err2, values) {
            expect(values).length(3);
            done(err || err2);
          });
        });
      });
    });
  });
}

// backendSpec('IndexedDB', require('indexed/lib/indexed-db'));
backendSpec('localStorage', require('indexed/lib/local-storage'));
