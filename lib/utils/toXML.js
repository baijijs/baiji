'use strict';

const js2xmlparser = require('js2xmlparser');
const toJSON = require('./toJSON');

module.exports = function toXML(input) {
  let xml;
  if (input && typeof input.toXML === 'function') {
    xml = input.toXML();
  } else {
    if (input) {
      // Trigger toJSON() conversions
      input = toJSON(input);
    }
    if (Array.isArray(input)) {
      input = { result: input };
    }
    xml = js2xmlparser.parse('root', input, {
      prettyPrinting: {
        indentString: '  '
      },
      convertMap: {
        '[object Date]': function(date) {
          return date.toISOString();
        }
      }
    });
  }
  return xml;
};
