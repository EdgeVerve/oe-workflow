/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

'use strict';

var logger = require('oe-logger');
var log = logger('BoundaryEvent-Parser');

var util = require('util');
var BPMNFlowObject = require('./flowobject.js').BPMNFlowObject;

/**
 * Subsumes all kind of start events
 * @param {String} bpmnId BpmnId
 * @param {String} name Name
 * @param {String} type Type
 * @param {String} attachedToRef AttachedToRef
 * @param {Object} cancelActivity CancelActivity
 * @constructor
 */
exports.createBPMNBoundaryEvent = function createBPMNBoundaryEvent(bpmnId, name, type, attachedToRef, cancelActivity) {
  log.debug(log.defaultContext(), 'BPMN boundary constructor called');
  return (new BPMNBoundaryEvent(bpmnId, name, type, attachedToRef, cancelActivity));
};


/**
 * Subsumes all kind of start events
 * @param {String} bpmnId BpmnId
 * @param {String} name Name
 * @param {String} type Type
 * @param {String} attachedToRef AttachedToRef
 * @param {Object} cancelActivity CancelActivity
 * @constructor
 */
var BPMNBoundaryEvent = exports.BPMNBoundaryEvent = function BpmnBoundaryEvent(bpmnId, name, type, attachedToRef, cancelActivity) {
  BPMNFlowObject.call(this, bpmnId, name, type);
  this.isBoundaryEvent = true;
  this.attachedToRef = attachedToRef;
  this.cancelActivity = cancelActivity;
};
util.inherits(BPMNBoundaryEvent, BPMNFlowObject);

/**
 * Validate assertions for name and sequence flows
 * @param {BPMNProcessDefinition} processDefinition Process-Definition
 * @param {BPMNParseErrorQueue} errorQueue ErrorQueue
 */
// BPMNBoundaryEvent.prototype.validate = function validate(processDefinition, errorQueue) {
//   this.assertName(errorQueue);
//   this.assertNoIncomingSequenceFlows(processDefinition, errorQueue);
//   this.assertOneOutgoingSequenceFlow(processDefinition, errorQueue);
// };
