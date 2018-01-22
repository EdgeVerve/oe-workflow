/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

'use strict';

var BPMNSequenceFlow;
var logger = require('oe-logger');
var log = logger('SequenceFlow-Parser');

/**
 * Check if the name is of sequence flow
 * @param {String} localName name without namespace prefix
 * @return {Boolean} isSequenceFlowName
 */
exports.isSequenceFlowName = function isSequenceFlowName(localName) {
  return (localName.toLowerCase().indexOf('sequenceflow') > -1);
};

/**
 * create a bpmn sequence flow
 * @param {String} bpmnId BpmnId
 * @param {String} name Name
 * @param {String} type Type
 * @param {String} sourceRef SourceRef
 * @param {String} targetRef TargetRef
 * @constructor
 */
BPMNSequenceFlow = exports.BPMNSequenceFlow = function BPMNSequenceFlow(bpmnId, name, type, sourceRef, targetRef) {
  log.debug(log.defaultContext(), 'BPMNSequenceFlow called');
  this.bpmnId = bpmnId;
  this.name = name;
  this.type = type;
  this.sourceRef = sourceRef;
  this.targetRef = targetRef;
  this.isSequenceFlow = true;
};

/**
 * Given a sequence flow node, create a sequence flow
 * @param {Object} flowObject flowObject
 * @constructor
 */
exports.createBPMNSequenceFlow = function createBPMNSequenceFlow(flowObject) {
  var bpmnId = flowObject.attributes_.id.value;
  var name = '';
  if (typeof flowObject.attributes_.name !== 'undefined') {
    name = flowObject.attributes_.name.value;
  }
  var type = flowObject.attributes_ns.local;
  var sourceRef = flowObject.attributes_.sourceRef.value;
  var targetRef = flowObject.attributes_.targetRef.value;
  var sequenceFlowObject = new BPMNSequenceFlow(bpmnId, name, type, sourceRef, targetRef);
  if (flowObject.hasOwnProperty('bpmn2:conditionExpression')) {
    sequenceFlowObject.isConditionalFlow = true;
    sequenceFlowObject.script = flowObject['bpmn2:conditionExpression'].text;
  }
  return sequenceFlowObject;
};
