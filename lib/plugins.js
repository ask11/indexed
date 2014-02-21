var Promise = require('promise');

/**
 * Expose `Plugin`.
 */

module.exports = Plugin;

/**
 * Initialize a new `Plugin`.
 */

function Plugin(obj) {
  if (obj) return mixin(obj);
}

/**
 * Mixin the plugin properties to `obj`.
 *
 * @param {Object} obj
 * @return {Object}
 */

function mixin(obj) {
  for (var key in Plugin.prototype) {
    obj[key] = Plugin.prototype[key];
  }
  return obj;
}

/**
 * Define getter with `name` and `val`.
 *
 * @param {String} name
 * @param {Any} val
 * @return {Plugin}
 */

Plugin.prototype.defineGetter = function(name, val) {
  Object.defineProperty(this, name, {
    get: function() { return val }
  });
  return this;
};

/**
 * Define `this.then` method as listener to events.
 *
 * @param {Array|String} succ - names for on success listeners
 * @param {Array|String} fail - names for on failure listeners
 * @return {Plugin}
 */

Plugin.prototype.defineThenAsListener = function(succ, fail) {
  if (!Array.isArray(succ)) succ = [succ];
  if (!Array.isArray(fail)) fail = [fail];

  var that = this;
  var promise = new Promise(function(resolve, reject) {
    succ.forEach(function(name) { that.once(name, resolve) });
    fail.forEach(function(name) { that.once(name, reject) });
  });

  // TODO:
  // - do I need delete `this.then` on resolve/reject or it always exists?
  // - .catch to follow ES6 http://www.html5rocks.com/en/tutorials/es6/promises/
  this.then = promise.then.bind(promise);

  return this;
};
