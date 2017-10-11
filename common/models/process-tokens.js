/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
/**
 * Implementation of Process-Token
 * @author Kangan Verma(kangan06), Mandeep Gill(mandeep6ill), Prem Sai(premsai-ch), Vivek Mittal(vivekmittal07)
 */

var logger = require('oe-logger');
var log = logger('ProcessTokens');
const uuidv4 = require('uuid/v4');

module.exports.createToken = function createToken(name, bpmnId, message, meta) {
  var token = new ProcessToken(name, bpmnId, message, meta);
  token.validate();
  return token;
};

module.exports.findToken = function findToken(tokens, id) {
  if (typeof tokens[id] !== 'undefined') {
    return tokens[id];
  }
};

module.exports.remove = function remove(token) {
  token.status = 'done';
  token.endTime = new Date();
};

var ProcessToken = function ProcessToken(name, bpmnId, message, meta) {
  this.name = name;
  this.startTime = new Date();
  this.bpmnId = bpmnId;
  this.id = uuidv4();
  this.status = 'pending';
  if (typeof message !== 'undefined') {
    this.message = message;
  }
  if (typeof meta !== 'undefined') {
    this.meta = meta;
  }
};

ProcessToken.prototype.validate = function validate() {
  if (typeof this.name === 'undefined') {
    // Should never happen, validation of bpmn done already
    log.error('Invalid token name');
    return false;
  }
  return true;
};

ProcessToken.prototype.updateMeta = function update(key, value) {
  if (typeof this.meta === 'undefined') {
    this.meta = {};
  }
  this.meta[key] = value;
};
