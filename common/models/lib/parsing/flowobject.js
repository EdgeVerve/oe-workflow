/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

'use strict';
var logger = require('oe-logger');
var log = logger('FlowObject-Parser');

/**
 * Subsumes all kind process elements that have incoming and outgoing flows.
 * Name according to http://de.wikipedia.org/wiki/Business_Process_Model_and_Notation#Notation
 * @param {String} bpmnId BpmnId
 * @param {String} name Name
 * @param {String} type Type
 * @constructor
 */
var BPMNFlowObject = exports.BPMNFlowObject = function BPMNFlowObject(bpmnId, name, type) {
  this.bpmnId = bpmnId;
  this.name = name;
  this.type = type;
  this.isFlowObject = true;
  log.debug(log.defaultContext(), 'BPMN Flow Object constructor called.');
};

/**
 * To assert that name is not empty
 * @param {BPMNParseErrorQueue} errorQueue ErrorQueue
 */
BPMNFlowObject.prototype.assertName = function ErrorQueue(errorQueue) {
  if (this.name) {
    var name = this.name.trim();
  }
  if (name === '') {
    errorQueue.addError('FO1', this, 'Found a ' + this.type + " flow object having no name. BPMN id='" + this.bpmnId + "'.");
  }
};

/**
 * To assert that bpmn flow object should have at least one outgoing sequence flow
 * @param {BPMNProcessDefinition} processDefinition ProcessDefinition
 * @param {BPMNParseErrorQueue} errorQueue ErrorQueue
 */
BPMNFlowObject.prototype.assertOutgoingSequenceFlows = function assertOutgoingSequenceFlows(processDefinition, errorQueue) {
  if (!processDefinition.hasOutgoingSequenceFlows(this)) {
    errorQueue.addError('FO2', this, 'The ' + this.type + " '" + this.name + "' must have at least one outgoing sequence flow.");
  }
};

/**
 * To assert that process defintion hast exactly one outgoing sequence flow
 * @param {BPMNProcessDefinition} processDefinition ProcessDefinition
 * @param {BPMNParseErrorQueue} errorQueue ErrorQueue
 */
BPMNFlowObject.prototype.assertOneOutgoingSequenceFlow = function assertOneOutgoingSequenceFlow(processDefinition, errorQueue) {
  if (this.isCompensationEvent) {
    return;
  }
  var outgoingFlows = processDefinition.getOutgoingSequenceFlows(this);
  if (outgoingFlows.length !== 1) {
    errorQueue.addError('FO3', this, 'The ' + this.type + " '" + this.name + "' must have exactly one outgoing sequence flow.");
  }
};

/**
 * To assert that bpmn flow object has no outgoing sequence flow
 * @param {BPMNProcessDefinition} processDefinition ProcessDefinition
 * @param {BPMNParseErrorQueue} errorQueue ErrorQueue
 */
BPMNFlowObject.prototype.assertNoOutgoingSequenceFlows = function assertNoOutgoingSequenceFlows(processDefinition, errorQueue) {
  if (processDefinition.hasOutgoingSequenceFlows(this)) {
    errorQueue.addError('FO4', this, 'The ' + this.type + " '" + this.name + "' must not have outgoing sequence flows.");
  }
};

/**
 * To assert that bpmn flow object has at least one incoming sequence flow
 * @param {BPMNProcessDefinition} processDefinition ProcessDefinition
 * @param {BPMNParseErrorQueue} errorQueue ErrorQueue
 */
BPMNFlowObject.prototype.assertIncomingSequenceFlows = function assertIncomingSequenceFlows(processDefinition, errorQueue) {
  if (!processDefinition.hasIncomingSequenceFlows(this)) {
    errorQueue.addError('FO5', this, 'The ' + this.type + " '" + this.name + "' must have at least one incoming sequence flow.");
  }
};

/**
 * To assert that bpmn flow object has no incoming sequence flow
 * @param {BPMNProcessDefinition} processDefinition ProcessDefinition
 * @param {BPMNParseErrorQueue} errorQueue ErrorQueue
 */
BPMNFlowObject.prototype.assertNoIncomingSequenceFlows = function assertNoIncomingSequenceFlows(processDefinition, errorQueue) {
  if (processDefinition.hasIncomingSequenceFlows(this)) {
    errorQueue.addError('FO5', this, 'The ' + this.type + " '" + this.name + "' must not have incoming sequence flows.");
  }
};


