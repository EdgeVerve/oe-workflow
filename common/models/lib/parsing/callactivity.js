/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

'use strict';

var logger = require('oe-logger');
var log = logger('CallActivity-Parser');

var BPMNActivity = require('./activity.js').BPMNActivity;
var util = require('util');
var BPMNCallActivity;
var checkAndAddMultiInstanceCharacteristics = require('./taskmarkers.js').checkAndAddMultiInstanceCharacteristics;

/**
 * create a bpmn call activity
 * @param {Object} flowObject flowObject
 * @returns {Object} BPMNCallActivity
 */
exports.createBPMNCallActivity = function createBPMNCallActivity(flowObject) {
  log.debug(log.defaultContext(), 'BPMN Call Activity constructor called');
  var bpmnId = flowObject.attributes_.id.value;
  var name = '';
  if (typeof flowObject.attributes_.name !== 'undefined') {
    name = flowObject.attributes_.name.value;
  }
  var type = flowObject.attributes_ns.local;
  var calledElement = flowObject.attributes_.calledElement.value;

  var callActivityObject = new BPMNCallActivity(bpmnId, name, type, calledElement);
  checkAndAddMultiInstanceCharacteristics(flowObject, callActivityObject);
  return callActivityObject;
};

/**
 * Subsumes all kind of tasks
 * @param {String} bpmnId BpmnId
 * @param {String} name Name
 * @param {String} type Type
 * @param {String} calledElement Element
 * @constructor
 */
BPMNCallActivity = exports.BPMNCallActivity = function BPMNCallActivity(bpmnId, name, type, calledElement) {
  BPMNActivity.call(this, bpmnId, name, type);
  this.isCallActivity = true;
  this.subProcessId = calledElement;
  this.isMultiInstanceLoop = false;
  this.isSequential = false;
};
util.inherits(BPMNCallActivity, BPMNActivity);

/**
 * Validate assertions for name and sequence flows
 * @param {BPMNProcessDefinition} processDefinition Process-Definition
 * @param {BPMNParseErrorQueue} errorQueue ErrorQueue
 */
// BPMNCallActivity.prototype.validate = function validate(processDefinition, errorQueue) {
//   this.assertName(errorQueue);
//   this.assertIncomingSequenceFlows(processDefinition, errorQueue);
//   this.assertOutgoingSequenceFlows(processDefinition, errorQueue);
//   if (typeof this.subProcessId === 'undefined') {
//     errorQueue.addError('SubprocessId must be defined');
//   }
// };
