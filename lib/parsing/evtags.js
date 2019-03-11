/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

'use strict';
var parserUtils = require('./parserutils');
var logger = require('oe-logger');
var log = logger('EVTags-Parser');

var QueryString = exports.queryString = function queryString(type, key, value) {
  this.type = type;
  this.key = key;
  this.value = value;
};

exports.createQueryString = function createQueryString(node) {
  var getValue = parserUtils.getAttributesValue;
  log.debug(log.defaultContext(), 'query string constructor called.');
  return (new QueryString(
    node.local,
    getValue(node, 'key'),
    getValue(node, 'value')
  ));
};

exports.hasSpecifiedAttribute = function hasSpecifiedAttribute(name, attribute) {
  return (name.toLowerCase().indexOf(attribute) > -1);
};
