/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

'use strict';

var util = require('util');
var BPMNFlowObject = require('./flowobject.js').BPMNFlowObject;
var BPMNStartEvent;
var logger = require('oe-logger');
var log = logger('StartEvent-Parser');

/**
 * create a bpmn start event
 * @param {String} bpmnId BpmnId
 * @param {String} name Name
 * @param {String} type Type
 * @return {BPMNStartEvent} createBPMNStartEvent
 */
exports.createBPMNStartEvent = function createBPMNStartEvent(bpmnId, name, type) {
  return (new BPMNStartEvent(bpmnId, name, type));
};

/**
 * Subsumes all kind of start events
 * @param {String} bpmnId BpmnId
 * @param {String} name Name
 * @param {String} type Type
 * @param {Boolean} isInterrupting IsInterrupting
 * @constructor
 */
BPMNStartEvent = function BPMNStartEvent(bpmnId, name, type, isInterrupting) {
  log.debug(log.defaultContext(), 'BPMNStartEvent called');

  BPMNFlowObject.call(this, bpmnId, name, type);
  this.isStartEvent = true;
};
util.inherits(BPMNStartEvent, BPMNFlowObject);

exports.BPMNStartEvent = BPMNStartEvent;

/**
 * validatee assertions for name and sequence flows
 * @param {BPMNProcessDefinition} processDefinition ProcessDefinition
 * @param {BPMNParseErrorQueue} errorQueue ErrorQueue
 */
BPMNStartEvent.prototype.validate = function validate(processDefinition, errorQueue) {
  this.assertName(errorQueue);
  this.assertNoIncomingSequenceFlows(processDefinition, errorQueue);
  this.assertOneOutgoingSequenceFlow(processDefinition, errorQueue);
};
