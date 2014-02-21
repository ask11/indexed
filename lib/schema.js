
/**
 * Expose `Schema`.
 */

module.exports = Schema;

/**
 * Initialize new `Schema`.
 */

function Schema() {
  if (!(this instanceof Schema)) return new Schema();
}

/**
 * Define new version.
 *
 * @param {Number} version
 * @return {Schema}
 */

Schema.prototype.version = function(version) {
  return this;
};

Schema.prototype.addStore = function(name, options) {
  return this;
};

Schema.prototype.addIndex = function(name, path, options) {
  return this;
};

Schema.prototype.getStore = function(name) {
  return this;
};

Schema.prototype.put = function(values) {
  return this;
};

//

Schema.prototype.currentVersion = function() {
};

Schema.prototype.createStores = function(db) {
};

Schema.prototype.callback = function() {
};
