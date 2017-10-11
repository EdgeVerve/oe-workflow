/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

'use strict';

var logger = require('oe-logger');
var log = logger('MessageFlows-Parser');

/**
 * create a bpmn message flow
 * @param {String} bpmnId BpmnId
 * @param {String} name Name
 * @param {String} type Tyoe
 * @param {String} sourceRef SourceRef
 * @param {String} targetRef TargetRef
 * @constructor
 */
function BPMNMessageFlow(bpmnId, name, type, sourceRef, targetRef) {
  this.bpmnId = bpmnId;
  this.name = name;
  this.type = type;
  this.sourceRef = sourceRef;
  this.targetRef = targetRef;
  this.targetProcessDefinitionId = null;
  this.sourceProcessDefinitionId = null;
}
/**
 * create an array of message flows in a collaboration process
 * @param {Array} defObject Array of Message Flows for a collaboration process
 * @constructor
 */
exports.createBPMNMessageFlow = function createBPMNMessageFlow(defObject) {
  log.debug(log.defaultContext(), 'BPMN Message Flow constructor called.');
  var messageflows = [];
  if (typeof defObject === 'undefined') {
    return messageflows;
  }
  if (typeof defObject === 'object' && defObject.constructor.name === 'Array') {
    for (var messageflow of defObject) {
      messageflows.push(createMessageFlows(messageflow));
    }
  }
  if (typeof defObject === 'object' && defObject.constructor.name === 'Object') {
    messageflows.push(createMessageFlows(defObject));
  }
  return messageflows;
};

function createMessageFlows(messageflow) {
  var bpmnId = messageflow.attributes_.id.value;
  var name = '';
  if (typeof messageflow.attributes_.name !== 'undefined') {
    name = messageflow.attributes_.name.value;
  }
  var type = messageflow.attributes_ns.local;
  var sourceRef = messageflow.attributes_.sourceRef.value;
  var targetRef = messageflow.attributes_.targetRef.value;
  var finalMessageFlow = new BPMNMessageFlow(bpmnId, name, type, sourceRef, targetRef);
  return finalMessageFlow;
}
