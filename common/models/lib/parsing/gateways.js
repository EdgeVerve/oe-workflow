/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

'use strict';
var logger = require('oe-logger');
var log = logger('Gateways-Parser');

var util = require('util');
var BPMNFlowObject = require('./flowobject.js').BPMNFlowObject;
var isExclusiveGatewayName;
var BPMNExclusiveGateway;
var isInclusiveGatewayName;
var BPMNInclusiveGateway;
var isParallelGatewayName;
var BPMNParallelGateway;
var isEventGatewayName;

var BPMNEventGateway;
/**
 * Check if the name is of gateway
 * @param {String} localName name without namespace prefix
 * @return {Boolean} isGatewayName
 */
exports.isGatewayName = function isGatewayName(localName) {
  return (localName.toLowerCase().indexOf('gateway') > -1);
};

/**
 * create a bpmn gateway
 * @param {Object} flowObject FlowObject
 * @return {BPMNExclusiveGateway|BPMNParallelGateway} createBPMNGateway
 */
exports.createBPMNGateway = function createBPMNGateway(flowObject) {
  log.debug(log.defaultContext(), 'Gateway constructor called.');
  var gateway = null;
  var localName = flowObject.attributes_ns.local;
  var name = '';
  if (typeof flowObject.attributes_.name !== 'undefined') {
    name = flowObject.attributes_.name.value;
  }
  var id = flowObject.attributes_.id.value;
  var _default = '';
  if (typeof flowObject.attributes_.default !== 'undefined') {
    _default = flowObject.attributes_.default.value;
  }


  if (isExclusiveGatewayName(localName)) {
    gateway = new BPMNExclusiveGateway(id, name, _default, localName);
  } else if (isParallelGatewayName(localName)) {
    gateway = new BPMNParallelGateway(id, name, localName);
  } else if (isInclusiveGatewayName(localName)) {
    gateway = new BPMNInclusiveGateway(id, name, _default, localName);
  } else if (isEventGatewayName(localName)) {
    gateway = new BPMNEventGateway(id, name, localName);
  } else {
    log.error(log.defaultContext(), 'Gateway defined in the bpmn cannot be parsed');
  }
  return gateway;
};

/**
 * Check if the name is of exclusive gateway
 * @param {String} localName name without namespace prefix
 * @return {Boolean} isExclusiveGatewayName
 */
isExclusiveGatewayName = function isExclusiveGatewayName(localName) {
  return (localName === 'exclusiveGateway');
};


/**
 * create a bpmn exclusive gateway
 * @param {String} bpmnId BpmnId
 * @param {String} name Name
 * @param {*} _default Default
 * @param {String} type Type
 * @constructor
 */
BPMNExclusiveGateway = exports.BPMNExclusiveGateway = function BPMNExclusiveGateway(bpmnId, name, _default, type) {
  BPMNFlowObject.call(this, bpmnId, name, type);
  this.isExclusiveGateway = true;
  this.default = _default;
};
util.inherits(BPMNExclusiveGateway, BPMNFlowObject);

/**
 * to assert gateway flow cardinality for exclusive gateway
 * @param {BPMNProcessDefinition} processDefinition ProcessDefinition
 * @param {BPMNParseErrorQueue} errorQueue ErrorQueue
 */
BPMNExclusiveGateway.prototype.validate = function validate(processDefinition, errorQueue) {
  this.assertName(errorQueue);
  assertGatewayFlowCardinality(this, processDefinition, errorQueue);
};

/**
 * Check if the name is of gateway name
 * @param {String} localName LocalName
 * @returns {boolean} isInclusiveGatewayName
 */
isInclusiveGatewayName = function isInclusiveGatewayName(localName) {
  return (localName === 'inclusiveGateway');
};

/**
 * create a bpmn inclusive gateway
 * @param  {String} bpmnId BpmnId
 * @param  {String} name Name
 * @param  {*} _default Default
 * @param  {String} type Type
 */
BPMNInclusiveGateway = exports.BPMNInclusiveGateway = function BPMNInclusiveGateway(bpmnId, name, _default, type) {
  BPMNFlowObject.call(this, bpmnId, name, type);
  this.isInclusiveGateway = true;
  this.default = _default;
};
util.inherits(BPMNInclusiveGateway, BPMNFlowObject);

/**
 * To assert gateway flow cardinality for inclusive gateway
 * @param {Object} processDefinition ProcessDefinition
 * @param {Object} errorQueue ErrorQueue
 */
BPMNInclusiveGateway.prototype.validate = function validate(processDefinition, errorQueue) {
    // var self = this;

  this.assertName(errorQueue);
  assertGatewayFlowCardinality(this, processDefinition, errorQueue);
};


/**
 * Check if the name is of parallel gateway
 * @param {String} localName name without namespace prefix
 * @return {Boolean} isParallelGatewayName
 */
isParallelGatewayName = function isParallelGatewayName(localName) {
  return (localName === 'parallelGateway');
};

/**
 * create a bpmn parallel gateway
 * @param {String} bpmnId BpmnId
 * @param {String} name Name
 * @param {String} type Type
 * @constructor
 */
BPMNParallelGateway = exports.BPMNParallelGateway = function BPMNParallelGateway(bpmnId, name, type) {
  BPMNFlowObject.call(this, bpmnId, name, type);
  this.isParallelGateway = true;
};
util.inherits(BPMNParallelGateway, BPMNFlowObject);

/**
 * To assert gateway flow cardinality for parallel gateway
 * @param {BPMNProcessDefinition} processDefinition ProcessDefinition
 * @param {BPMNParseErrorQueue} errorQueue ErrorQueue
 */
BPMNParallelGateway.prototype.validate = function validate(processDefinition, errorQueue) {
  assertGatewayFlowCardinality(this, processDefinition, errorQueue);
};


/**
 * Check if the name is of event gateway
 * @param {String} localName name without namespace prefix
 * @return {Boolean} isEventGatewayName
 */
isEventGatewayName = function isEventGatewayName(localName) {
  return (localName === 'eventBasedGateway');
};

/**
 * Create a bpmn event gateway
 * @param {String} bpmnId BpmnId
 * @param {String} name Name
 * @param {String} type Type
 * @constructor
 */
BPMNEventGateway = exports.BPMNEventGateway = function BPMNEventGateway(bpmnId, name, type) {
  BPMNFlowObject.call(this, bpmnId, name, type);
  this.isEventGateway = true;
};
util.inherits(BPMNEventGateway, BPMNFlowObject);

/**
 * Deactive a bpmn process
 * @param {Object} currentProcess CurrentProcess
 */
BPMNEventGateway.prototype.deactivate = function deactivate(currentProcess) {
  this.isActive = false;
  var outgoingSequenceFlows = currentProcess.processDefinition.getOutgoingSequenceFlows(this);
  outgoingSequenceFlows.forEach(function iterateSeqFlows(outgoingSequenceFlow) {
    var flowObject = currentProcess.processDefinition.getProcessElement(outgoingSequenceFlow.targetRef);
    if (flowObject.isTimerEvent) {
      currentProcess.pendingTimerEvents.removeTimeout(flowObject.name);
    }
  });
};


/**
 * To assert gateway flow cardinality for bpmn event
 * @param {BPMNProcessDefinition} processDefinition ProcessDefinition
 * @param {BPMNParseErrorQueue} errorQueue ErrorQueue
 */
BPMNEventGateway.prototype.validate = function validate(processDefinition, errorQueue) {
  // TODO Need to check if all outgoing flows are event based flows
  // Check the target flow object has only one incoming flow
  this.assertName(errorQueue);
  assertGatewayFlowCardinality(this, processDefinition, errorQueue);
  var incomingSequenceFlows = processDefinition.getIncomingSequenceFlows(this);
  if (incomingSequenceFlows.length > 1) {
    errorQueue.addError('EGW', this, 'The ' + this.type + " '" + this.name + "' must have one incoming flow to work as event gateway.");
  }
};

/**
 * To assert gateway flow cardinality
 * @param {BPMNParallelGateway | BPMNExclusiveGateway} gateway Gateway
 * @param {BPMNProcessDefinition} processDefinition ProcessDefinition
 * @param {BPMNParseErrorQueue} errorQueue ErrorQueue
 */
function assertGatewayFlowCardinality(gateway, processDefinition, errorQueue) {
  var outgoingSequenceFlows;
  var incomingSequenceFlows;
  var isDiverging;
  var isConverging;

  gateway.assertIncomingSequenceFlows(processDefinition, errorQueue);
  gateway.assertOutgoingSequenceFlows(processDefinition, errorQueue);

  if (!errorQueue.hasErrors()) {
    outgoingSequenceFlows = processDefinition.getOutgoingSequenceFlows(gateway);
    incomingSequenceFlows = processDefinition.getIncomingSequenceFlows(gateway);

    isDiverging = outgoingSequenceFlows.length > 1;
    isConverging = incomingSequenceFlows.length > 1;
    if (!isDiverging && !isConverging) {
      errorQueue.addError('GW1', gateway, 'The ' + gateway.type + " '" + gateway.name + "' must have more than one incoming or outgoing flow to work as gateway.");
    }
  }
}
