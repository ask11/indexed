var db = require('./db');

// save link to store
var books = db.store('books');

// get book by primary key
books.get(234567, function(err, book) {
  console.log(book); // { title: 'Water Buffaloes', author: 'Fred', isbn: 234567 }
});

// Populates db in one readwrite transaction
// it batches requests automatically, so they run one after another.
books
  .put({ title: 'Quarry Memories', author: 'Fred', isbn: 456789 })
  .put({ title: 'Water Buffaloes', author: 'Fred', isbn: 567890 })
  .put({ title: 'Bedrock Nights', author: 'Barney', isbn: 678901 })
  .end(function() {
    // nothing returned it only means that data saved succesfully
  });

// properties
books.name; // 'books'
books.key; // 'isbn'
books.increment; // false
books.indexes; // list of indexes ['byTitle', 'byAuthor']
books.db; // link to db

// Save link to title index.
// In IndexedDB index is specialized persistent key-value storage
// with references to original store.
var titles = books.index('byTitle');

// in regular callback style
titles.get('Bedrock Nights', function(err, book) {
  console.log(book); // { title: 'Bedrock Nights', author: 'Barney', isbn: 345678 }
});

// get many values
titles
  .get('Water Buffaloes')
  .get('Quarry Memories')
  .then(function(values) {
    console.log(values); // Array(2)
  });

// index has more properties
titles.name; // 'byTitle'
titles.key; // title
titles.unique; // true
titles.store; // link to books instance
titles.db; // link to db instance

// additional handy methods
books.clear();
books.count();
books.put('key', 'val');
books.del('key');

db.on('put'); // all put events
db.on('del'); // all del events

db.on('put:books'); // put event to the store
books.on('del');
