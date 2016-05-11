'use strict';

const logError = require('./logError');

/*!
 * Compare two routes
 * @param {Object} r1 The first route { verb: 'get', path: '/:id' }
 * @param [Object} r2 The second route route: { verb: 'get', path: '/findOne' }
 * @returns {number} 1: r1 comes after r2, -1: r1 comes before r2, 0: equal
 */
module.exports = function sortRoute(r1, r2) {

  if (r1.name === r2.name) {
    logError(`Conflict method '${r1.name}' detected`);
  }

  if (r1.verb === r2.verb && r1.path === r2.path) {
    logError(`Conflict route path and verb detected for method '${r2.name}' and method '${r1.name}'`);
  }

  // Normalize the verbs
  let verb1 = r1.verb.toLowerCase();
  let verb2 = r2.verb.toLowerCase();

  console.log(verb1, verb2)

  if (verb1 === 'use') {
    verb1 = 'all';
  }
  if (verb2 === 'use') {
    verb2 = 'all';
  }

  // First sort by verb
  if (verb1 > verb2) {
    return -1;
  } else if (verb1 < verb2) {
    return 1;
  }

  // Sort by path part by part using the / delimiter
  // For example '/:id' will become ['', ':id'], '/findOne' will become
  // ['', 'findOne']
  let p1 = r1.path.split('/');
  let p2 = r2.path.split('/');
  let len = Math.min(p1.length, p2.length);

  // Loop through the parts and decide which path should come first
  for (let i = 0; i < len; i++) {
    // Asterisk has lower weight
    if (p1[i] === '*' && p2[i] !== '*') {
      return 1;
    } else if (p1[i] !== '*' && p2[i] === '*') {
      return -1;
    }

    // Empty part has lower weight
    if (p1[i] === '' && p2[i] !== '') {
      return 1;
    } else if (p1[i] !== '' && p2[i] === '') {
      return -1;
    }

    // Wildcard has lower weight
    if (p1[i][0] === ':' && p2[i][0] !== ':') {
      return 1;
    } else if (p1[i][0] !== ':' && p2[i][0] === ':') {
      return -1;
    }

    // Now the regular string comparision
    if (p1[i] > p2[i]) {
      return 1;
    } else if (p1[i] < p2[i]) {
      return -1;
    }
  }

  // Both paths have the common parts. The longer one should come before the
  // shorter one
  return p2.length - p1.length;
};
