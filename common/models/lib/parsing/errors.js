/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

'use strict';
var logger = require('oe-logger');
var log = logger('Error-Parser');

var BPMNParseErrorQueue;

/**
 * Parse the bpmn element to instantiate the global variables
 * @param {String} code Code
 * @param {{bpmnId: string, name: string, type: string}} bpmnElement BPMNElement
 * @param {string} description Description
 * @constructor
 */
function BPMNParseError(code, bpmnElement, description) {
  this.code = code;
  this.description = description;
  if (bpmnElement) {
    // = null, if we cannot parse the file, for example
    this.bpmnId = bpmnElement.bpmnId || 'Unknown';
    this.bpmnName = bpmnElement.name || '';
    this.bpmnType = bpmnElement.type || 'Unknown';
  }
}

/**
 * Create a bpmn parse error queue
 * @param {String} fileName FileName
 * @return {BPMNParseErrorQueue} BPMNParseErrorQueue
 */
exports.createBPMNParseErrorQueue = function createBPMNParseErrorQueue(fileName) {
  return (new BPMNParseErrorQueue(fileName));
};

/**
 * Create a bpmn parse error queue
 * @param {String} fileName FileName
 * @constructor
 */
BPMNParseErrorQueue = function BPMNParseErrorQueue(fileName) {
  this.bpmnParseErrors = [];
  this.fileName = fileName;
};

/**
 * Add an error entry
 * @param {String} code Code
 * @param {{bpmnId: string, name: string, type: string}} bpmnElement BpmnElement
 * @param {string} description Description
 */
BPMNParseErrorQueue.prototype.addError = function addError(code, bpmnElement, description) {
  this.bpmnParseErrors.push(new BPMNParseError(code, bpmnElement, description));
};

/**
 * get the error
 * @return {[BPMNParseError]} BPMNParseError
 */
BPMNParseErrorQueue.prototype.getErrors = function getErrors() {
  return this.bpmnParseErrors;
};

/**
 *  to report all errors
 * @param {Function} reportFunction ReportFunction
 */
BPMNParseErrorQueue.prototype.reportErrors = function reportErrors(reportFunction) {
  var errors = this.getErrors();
  errors.forEach(function iterateErrors(error) {
    reportFunction(error);
  });
};

/**
 * get the number of errors
 * @return {number} Num of Errors
 */
BPMNParseErrorQueue.prototype.getNumberOfErrors = function getNumberOfErrors() {
  return this.bpmnParseErrors.length;
};

/**
 * Check if errors are there or not
 * @return {Boolean} hasErrors
 */
BPMNParseErrorQueue.prototype.hasErrors = function hasErrors() {
  return (this.getNumberOfErrors() > 0);
};

/**
 * Clear all the errors
 */
BPMNParseErrorQueue.prototype.clear = function clearErrors() {
  this.bpmnParseErrors = [];
};

/**
 * Create and throw an error
 */
BPMNParseErrorQueue.prototype.throwError = function throwErrors() {
  // call built-in Error object to get stack and other properties required by the test framework
  var error = new Error();

  // mix-in relevant properties
  error.bpmnParseErrors = this.bpmnParseErrors;
  error.reportErrors = this.reportErrors;
  error.getNumberOfErrors = this.getNumberOfErrors;
  error.getErrors = this.getErrors;
  log.debug(log.defaultContext(), JSON.stringify(error));
};

/**
 * Check if error are there, and throw if any
 */
BPMNParseErrorQueue.prototype.check = function checkErrors() {
  if (this.hasErrors()) {
    this.throwError();
  }
};
