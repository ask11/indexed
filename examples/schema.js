var indexed = require('indexed');

// Define db schema from specification example
// http://www.w3.org/TR/IndexedDB/#introduction
//
// Schema validates in real-time, and throws errors,
// for duplicated stores or indexes.
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

// Expose `schema` for future use
module.exports = schema;
