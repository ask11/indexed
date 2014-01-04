var denodeify = require('promise').denodeify;

/**
 * List of supported methods.
 */

var methods = [
  'get',
  'put',
  'del',
  'clear',
  'batch',
  'all',
  'has',
  'count',
  'forEach'
];

/**
 * Expose `promises()`.
 */

module.exports = promises;

/**
 * Add promises support to all `Indexed` methods.
 *
 * @param {Indexed} Indexed
 * @api public
 */

function promises(Indexed) {
  methods.forEach(function(method) {
    Indexed.prototype[method] = denodeify(Indexed.prototype[method]);
  });
}
