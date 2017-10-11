/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

'use strict';

var logger = require('oe-logger');
var log = logger('EndEvent-Parser');

var util = require('util');
var BPMNFlowObject = require('./flowobject.js').BPMNFlowObject;
var BPMNEndEvent;

/**
 * create bpmn end event
 * @param {String} bpmnId BpmnId
 * @param {String} name Name
 * @param {String} type Type
 * @return {BPMNEndEvent} BPMNEndEvent
 */
exports.createBPMNEndEvent = function createBPMNEndEvent(bpmnId, name, type) {
  log.debug(log.defaultContext(), 'Bpmn End Event constructor called.');
  return (new BPMNEndEvent(bpmnId, name, type));
};

/**
 * Subsumes all kind of end events
 * @param {String} bpmnId BpmnId
 * @param {String} name Name
 * @param {String} type Type
 * @constructor
 */
BPMNEndEvent = exports.BPMNEndEvent = function BPMNEndEvent(bpmnId, name, type) {
  BPMNFlowObject.call(this, bpmnId, name, type);
  this.isEndEvent = true;
};
util.inherits(BPMNEndEvent, BPMNFlowObject);

/**
 * Validate assertions for name and sequence flows
 * @param {BPMNProcessDefinition} processDefinition processDefinition
 * @param {BPMNParseErrorQueue} errorQueue ErrorQueue
 */
BPMNEndEvent.prototype.validate = function validate(processDefinition, errorQueue) {
  this.assertName(errorQueue);
  this.assertIncomingSequenceFlows(processDefinition, errorQueue);
  this.assertNoOutgoingSequenceFlows(processDefinition, errorQueue);
};
