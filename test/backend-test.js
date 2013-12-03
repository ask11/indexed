function backendSpec(name, backend) {
  var indexed = require('indexed');
  var expect = require('chai').expect;
  var async = require('async');

  describe('Backend: '+ name, function() {
    if (!backend.supported) return;

    before(function() {
      expect(backend.supported).exist;
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

      it('adds only one value on each put', function(done) {
        var notebooks = indexed('notepad:notebooks');
        async.series([
          function(cb) { notebooks.put('1', { name: 'notebook 1' }, cb) },
          function(cb) { notebooks.put('2', { name: 'notebook 2' }, cb) },
          function(cb) { notebooks.put('1', { name: '1' }, cb) },
        ], function(err) {
          notebooks.count(function(err2, count) {
            expect(count).equal(2);
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
          function(cb) { scripts.has('io89UYbxq', cb) },
          function(cb) { scripts.del('io89UYbxq', cb) },
          function(cb) { scripts.has('io89UYbxq', cb) },
        ], function(err, result) {
          expect(result[0]).true;
          expect(result[2]).false;
          done(err);
        });
      });

      it('allows parallel remove', function(done) {
        async.parallel([
          function(cb) { scripts.del('iusyn9ds2', cb) },
          function(cb) { scripts.del('io89UYbxq', cb) },
          function(cb) { scripts.del('op8Uj7hx0', cb) },
        ], function(err) {
          scripts.count(function(err2, count) {
            expect(count).equal(0);
            done(err || err2);
          });
        });
      });

      it('does nothing when value is not found', function(done) {
        scripts.del('fake-key', function(err) {
          scripts.count(function(err2, count) {
            expect(count).equal(3);
            done(err || err2);
          });
        });
      });
    });

    describe('clear', function() {
      afterEach(function(done) {
        async.parallel([
          function(cb) { indexed.dropDb('writer', cb) },
          function(cb) { indexed.dropDb('notepad', cb) },
          function(cb) { indexed.dropDb('dreamy', cb) },
        ], done);
      });

      it('clears only one collection', function(done) {
        var notes = indexed('notepad:notes');
        var scripts = indexed('writer:scripts');

        async.series([
          function(cb) { notes.batch([
            { type: 'put', key: '1', value: { name: 'note 1' } },
            { type: 'put', key: '2', value: { name: 'note 2' } },
          ], cb) },
          function(cb) { scripts.put('foo', 'bar', cb) },
          function(cb) { scripts.clear(cb) },
          function(cb) { notes.count(cb) },
          function(cb) { scripts.count(cb) },
        ], function(err, result) {
          expect(result[3]).equal(2);
          expect(result[4]).equal(0);
          done(err);
        });
      });

      it('allows parallel dropping', function(done) {
        var notes = indexed('notepad:notes');
        var dreams = indexed('dreamy:dreams');
        var scripts = indexed('writer:scripts');

        async.series([
          function(cb) { notes.put('1', 'foo', cb) },
          function(cb) { dreams.put('2', 'bar', cb) },
          function(cb) { scripts.put('3', 'baz', cb) },
        ], function() {
          async.parallel([
            function(cb) { notes.clear(cb) },
            function(cb) { dreams.clear(cb) },
            function(cb) { scripts.clear(cb) },
          ], done);
        });
      });
    });

    describe('batch', function() {
      afterEach(function(done) {
        indexed.dropDb('notepad', done);
      });

      it('adds and remove data', function(done) {
        var notes = indexed('notepad:notes');

        async.series([
          function(cb) { notes.batch([
            { type: 'put', key: '1', value: { name: 'note 1' } },
            { type: 'put', key: '2', value: { name: 'note 2' } },
            { type: 'put', key: '3', value: { name: 'note 3' } },
          ], cb) },
          function(cb) { notes.count(cb) },
          function(cb) { notes.batch([
            { type: 'del', key: '1' },
            { type: 'del', key: '2' },
            { type: 'put', key: '4', value: { name: 'note 4' } },
          ], cb) },
          function(cb) { notes.count(cb) },
        ], function(err, result) {
          expect(result[1]).equal(3);
          expect(result[3]).equal(2);
          done(err);
        });
      });

      it('works in parallel', function(done) {
        var notebooks = indexed('notepad:notebooks');
        var tags = indexed('notepad:tags');

        async.parallel([
          function(cb) { tags.batch([
            { type: 'del', key: '0' },
            { type: 'put', key: '1', value: 'tag 1' },
            { type: 'put', key: '2', value: 'tag 2' },
            { type: 'put', key: '3', value: 'tag 3' },
          ], cb) },
          function(cb) { notebooks.batch([
            { type: 'del', key: '1' },
            { type: 'put', key: '1', value: 'notebook 1' },
          ], cb) },
          function(cb) { notebooks.batch([
            { type: 'put', key: '2', value: 'notebook 2' },
            { type: 'put', key: '3', value: 'notebook 3' },
            { type: 'put', key: '4', value: 'notebook 4' },
          ], cb) },
        ], function(err) {
          tags.count(function(err2, count) {
            expect(count).equal(3);
            notebooks.count(function(err3, count) {
              expect(count).equal(4);
              done(err || err2 || err3);
            });
          });
        });
      });
    });

    describe('createReadStream', function() {

    });
  });
}

backendSpec('localStorage', require('indexed/lib/localstorage'));
// backendSpec('IndexedDB', require('indexed/lib/indexed-db'));
