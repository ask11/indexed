# Treo

> Consistent API to IndexedDB

[![](https://img.shields.io/npm/v/treo.svg)](https://npmjs.org/package/treo)
[![](https://img.shields.io/travis/treojs/treo.svg)](https://travis-ci.org/treojs/treo)
[![](http://img.shields.io/npm/dm/treo.svg)](https://npmjs.org/package/treo)

The goal of treo is **to make IndexedDB mainstream by providing consistent API across all modern browsers**.
[IndexedDB](https://www.w3.org/TR/IndexedDB/) is a powerful technology, which main problem is swamp color or last 20%:

[![image](https://cloud.githubusercontent.com/assets/158189/13082651/cd6a8b2c-d4d1-11e5-8e0a-3e4841a5140d.png)](http://caniuse.com/#feat=indexeddb)

Official standard was finalized on [July 4 2013](https://www.w3.org/TR/2013/CR-IndexedDB-20130704/). But major browsers still have a lot of implementation bugs ([IE], [Safari]). Because of this every library that relies on IndexedDB tries to be its own universe ([lovefield](https://github.com/google/lovefield), [dexie](https://github.com/dfahlander/Dexie.js), [pouchdb](https://github.com/pouchdb/pouchdb)).

Treo limits its features by official specification, hides API complexity, works across all modern browsers and provides new features from coming [2.0 spec](https://github.com/w3c/IndexedDB).

[![](https://saucelabs.com/browser-matrix/treo.svg)](https://saucelabs.com/u/treo)

## Main features

- **Focus on IndexedDB itself**. If you know official spec, you can work with treo. And experience with treo helps you to understand the spec.
- **Cross-browser support**. [SauceLabs](https://github.com/defunctzombie/zuul) allows to automate cross-browser testing.
- **npm and modularity**. Treo contains [a bunch of small modules](#useful-modules), which focus on different IndexedDB features. If integration of treo is too big for your project, you still can benefit from small parts, like [idb-schema](https://github.com/treojs/idb-schema) or [idb-batch](https://github.com/treojs/idb-batch). The whole library is ~230 SLOC and just 4.84 kB (minified + gzipped).
- **ES2015 and async/await syntax**. [IndexedDB API](https://www.w3.org/TR/IndexedDB/) was designed in 2010 and looks odd in 2016. Instead treo uses Promise for all asynchronous operations, async/await to simplify callback's flow, and ES2015 for better code readability.

## Installation

    npm install treo --save

Standalone build available as [dist/treo.min.js](./dist/treo.min.js).

```html
<script src="treo.min.js"></script>
<script>db = window.treo('library')</script>
```

## Example

Let's rewrite the official [w3c example](http://www.w3.org/TR/IndexedDB/#introduction)
with treo, [idb-schema](https://github.com/treojs/idb-schema), ES2015, and [async/await syntax](https://jakearchibald.com/2014/es7-async-functions/):

```js
import treo from 'treo'
import Schema from 'idb-schema'

// define db schema
const schema = new Schema()
.version(1)
  .addStore('books', { key: 'isbn' })
  .addIndex('byTitle', 'title', { unique: true })
  .addIndex('byAuthor', 'author')
.version(2)
  .getStore('books')
  .addIndex('byYear', 'year')
.version(3)
  .addStore('magazines')
  .addIndex('byPublisher', 'publisher')
  .addIndex('byFrequency', 'frequency')

// open database using schema
const db = await treo('library', schema.version(), schema.callback())
db.version // 3

// put some data in one transaction
await db.books.batch({
  key1: { title: 'Quarry Memories', author: 'Fred', year: 2012 },
  key2: { title: 'Water Buffaloes', author: 'Fred', year: 2012 },
  key3: { title: 'Bedrock Nights', author: 'Barney', year: 2013 },
})

// use indexes
const { byTitle, byAuthor } = db.books
const book = await byTitle.get('Bedrock Nights') // get a single book by title using an index
const all = await byAuthor.getAll('Fred') // get all books filtered by author

// add a try/catch block to handle errors, or use db.on("error") as global handler
// database connection may be closed when it is no longer needed
db.close()
```

## Cross-browser support

https://github.com/treojs/treo-websql

- **It uses native implementation in Safari 9+ and fallback on WebSQL**. Apple claims [they don't see enough adoption of IndexedDB](https://twitter.com/simevidas/status/610910096097304578), so they don't want to fix major bugs. But since 9.x we can work around some limitations and show them desire to use IndexedDB. Check [design decisions](#design-decisions) for more details.

- * multiEntry indexes (IE), **but** supports compound indexes by enabling shim
* transaction reuse and transaction to multiple stores (Safari), **but** fixes versionchange and unique indexes validation
* db.on “abort”, store.transaction, index.store (because no transaction support)
* store.increment, because of IE (https://msdn.microsoft.com/en-us/library/hh772573(v=vs.85).aspx) (this is minor, but still)
* index.multy

Next iteration of library should remove some restrictions and add missing features, like transaction reuse, transaction to multiple stores and multiEntry indexes.
IE implementation is limited, there're no WebSQL, so we need to work around this.

## Useful modules

Treo doesn't force you to build custom plugins. Just build a module that operates with IndexedDB objects and you can use it with `treo` or any other library.
Below is a list of useful modules, that can extend default functionality. Feel free to share your module here.

* [idb-take](https://github.com/treojs/idb-take) - Take values from `IDBStore` or `IDBIndex`
* [idb-schema](https://github.com/treojs/idb-schema) - `IndexedDB` schema manager
* [idb-batch](https://github.com/treojs/idb-batch) - Perform batch update
* [idb-range](https://github.com/treojs/idb-range) - MongoDB inspired interface for `IDBKeyRange`
* [idb-request](https://github.com/treojs/idb-request) - Transform `IndexedDB` request-like object to a `Promise`
* [idb-factory](https://github.com/treojs/idb-factory) - Better `window.indexedDB`

## Documentation (short version)

**Explanation notes**:
- `await` means, that method returns `Promise`.
- `range` is any combination supported by [idb-range](https://github.com/treojs/idb-range#rangeopts).
- check [full documentation](https://github.com/treojs/treo#full-documentation) for details about every method.

```js
import treo, { Database, Store, Index } from 'treo' // standalone classes are also available

// Database represents connection to a database.
const db = await treo(dbName, version, upgradeCallback) // new Database(rawDb)
db.name
db.version
db.stores // array of stores
await db.del() // close && deleteDatabase
db.close() // close db and emit "close"
db.on('error')
db.on('close')
db.on('versionchange')

// Store is the primary mechanism for storing data.
const store = db.store(storeName) // new Store(db, storeName)
store.name
store.key
store.indexes // array of indexes
await store.get(key) // returns undefined when record does not exists
await store.getAll([range], [limit]) // array
await store.count([range])
await store.add([key], val)
await store.put([key], val)
await store.del(key)
await store.batch(operations) // best way to reuse transaction
await store.clear()
store.openCursor(range, [direction]) // low level proxy to native openCursor

// Index allows to looking up records in a store using properties of the values.
const index = store.index(indexName) // new Index(db, storeName, indexName)
index.name
index.key
index.unique
await index.get(key) // undefined if record does not exist
await index.getAll([range], [limit])
await index.count([range])
index.openCursor(range, [direction]) // low level proxy to native openCursor
```

## Full documentation

Coming soon...

## License

[MIT](./LICENSE)
