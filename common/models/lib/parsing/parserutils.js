/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

'use strict';

var logger = require('oe-logger');
var log = logger('PaserUtil-Parser');

/**
 * get attribute name from attributes
 * @param {Object} node Node
 * @param {String} attributeName AttributeName
 * @return {String} getAttributesValue
 */
exports.getAttributesValue = function getAttributesValue(node, attributeName) {
  var value = null;
  var attribute = null;
  var attributes = node.attributes;

  if (attributes) {
    attribute = attributes[attributeName];
    value = attribute ? attribute.value : null;
  }
  return value;
};

/**
 * Split name with respect to a colon
 * @param {String} prefixedName A name such as ns1:blah
 * @return {{prefix: String, localName: String}} splitPrefixedName
 */
exports.splitPrefixedName = function splitPrefixedName(prefixedName) {
  log.debug(log.defaultContext(), 'splitPrefixedName called');
  var result = {prefix: '', localName: ''};
  var colon = prefixedName.indexOf(':');

  if (colon) {
    result.prefix = prefixedName.substring(0, colon);
    result.localName = prefixedName.substring(colon + 1);
  } else {
    result.localName = prefixedName;
  }

  return result;
};
