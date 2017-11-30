/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

'use strict';

var util = require('util');
var BPMNFlowObject = require('./flowobject.js').BPMNFlowObject;
var logger = require('oe-logger');
var log = logger('IntermediateEvents-Parser');

/**
 * create a bpmn intermediate throw event
 * @param {String} bpmnId BpmnId
 * @param {String} name Name
 * @param {String} type Type
 * @return {BPMNIntermediateThrowEvent} BPMNIntermediateThrowEvent
 */
function createBPMNIntermediateThrowEvent(bpmnId, name, type) {
  log.debug(log.defaultContext(), 'Intermediate Throw constructor called.');
  return (new BPMNIntermediateThrowEvent(bpmnId, name, type));
}

/**
 * Check if the name is of intermediate throw event
 * @param {String} localName name without namespace prefix
 * @return {Boolean} isIntermediateThrowEventName
 */
exports.isIntermediateThrowEventName = function isIntermediateThrowEventName(localName) {
  return (localName === 'intermediateThrowEvent');
};

/**
 * Subsumes all kind of end events
 * @param {String} bpmnId BpmnId
 * @param {String} name Name
 * @param {String} type Type
 * @constructor
 */
function BPMNIntermediateThrowEvent(bpmnId, name, type) {
  BPMNFlowObject.call(this, bpmnId, name, type);
  this.isIntermediateThrowEvent = true;
}
util.inherits(BPMNIntermediateThrowEvent, BPMNFlowObject);

/**
 * validate the intermediate throw event
 * @param {BPMNProcessDefinition} processDefinition ProcessDefinition
 * @param {BPMNParseErrorQueue} errorQueue ErrorQueue
 */
BPMNIntermediateThrowEvent.prototype.validate = function validate(processDefinition, errorQueue) {
  validateIntermediateEvent(this, processDefinition, errorQueue);
};

/**
 * create a bpmn intermediate catch event
 * @param {String} bpmnId BpmnId
 * @param {String} name Name
 * @param {String} type Type
 * @return {BPMNIntermediateCatchEvent} createBPMNIntermediateCatchEvent
 */
function createBPMNIntermediateCatchEvent(bpmnId, name, type) {
  log.debug(log.defaultContext(), 'Intermediate Catch Event constructor called.');
  return (new BPMNIntermediateCatchEvent(bpmnId, name, type));
}

/**
 * Check if the name is of intermediate catch event
 * @param {String} localName name without namespace prefix
 * @return {Boolean} isIntermediateCatchEventName
 */
exports.isIntermediateCatchEventName = function isIntermediateCatchEventName(localName) {
  return (localName === 'intermediateCatchEvent');
};

/**
 * Subsumes all kind of Intermediate catch events
 * @param {String} bpmnId BpmnId
 * @param {String} name Name
 * @param {String} type Type
 * @constructor
 */
function BPMNIntermediateCatchEvent(bpmnId, name, type) {
  BPMNFlowObject.call(this, bpmnId, name, type);
  this.isIntermediateCatchEvent = true;
}
util.inherits(BPMNIntermediateCatchEvent, BPMNFlowObject);

/**
 * validate the intermediate catch catch event
 * @param {BPMNProcessDefinition} processDefinition ProcessDefinition
 * @param {BPMNParseErrorQueue} errorQueue ErrorQueue
 */
BPMNIntermediateCatchEvent.prototype.validate = function validate(processDefinition, errorQueue) {
  validateIntermediateEvent(this, processDefinition, errorQueue);
};

/**
 * Validate assertions for name and sequence flows
 * @param {BPMNIntermediateCatchEvent | BPMNIntermediateThrowEvent} event Event
 * @param {BPMNProcessDefinition} processDefinition ProcessDefinition
 * @param {BPMNParseErrorQueue} errorQueue ErrorQueue
 */
function validateIntermediateEvent(event, processDefinition, errorQueue) {
  event.assertName(errorQueue);
  event.assertIncomingSequenceFlows(processDefinition, errorQueue);
  event.assertOneOutgoingSequenceFlow(processDefinition, errorQueue);
}


/**
 * Subsumes all kind of Intermediate catch events
 * @param {String} bpmnId BpmnId
 * @param {String} name Name
 * @param {String} type Type
 * @constructor
 */
exports.createBPMNIntermediateEvent = function createBPMNIntermediateEvent(bpmnId, name, type) {
  if (type.indexOf('Throw') > 0) {
    return createBPMNIntermediateThrowEvent(bpmnId, name, type);
  } else if (type.indexOf('Catch') > 0) {
    return createBPMNIntermediateCatchEvent(bpmnId, name, type);
  }
  return;
};
