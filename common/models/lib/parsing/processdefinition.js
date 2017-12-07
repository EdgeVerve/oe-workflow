/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

var logger = require('oe-logger');
var log = logger('ProcessDefinition-Parser');
var parserUtils = require('./parserutils');
var BPMNFlowObject = require('./buildFlowObjects.js');
var BPMNProcessDefinition;

/**
 * create a bpmn process definition
 * @param {Object} defObject DefinitionObject
 * @constructor
 */
BPMNProcessDefinition = exports.BPMNProcessDefinition = function BPMNProcessDefinition(defObject) {
  log.debug(log.defaultContext(), 'BPMNProcessDefinition called');
  var bpmnId = defObject.attributes_.id.value;
  var name = '';
  if (typeof defObject.attributes_.name !== 'undefined') {
    name = defObject.attributes_.name.value;
  }
  var processElements = BPMNFlowObject.createFlowObjects(defObject);
  this.bpmnId = bpmnId;
  this.name = name;
  this.flowObjects = processElements.flowObjects;
  this.sequenceFlows = processElements.sequenceFlows;
  this.messageFlows = [];
  this.dataObjectReferences = [];
  this.associations = processElements.associations;
  this.lanes = processElements.lanes;

    // Process Elements = Flow objects + connection objects + artifacts
    // Semantics of these names is described in http://de.wikipedia.org/wiki/Business_Process_Model_and_Notation#Notation
  this.processElementIndex = null;
  this.sequenceFlowBySourceIndex = null;
  this.sequenceFlowByTargetIndex = null;
  this.messageFlowBySourceIndex = null;
  this.messageFlowByTargetIndex = null;
  this.boundaryEventsByAttachmentIndex = null;
  this.nameMap = null;
  this.isProcessDefinition = true;
  this.eventObjectMap = {};

    /** {Array.<BPMNParticipant>} */
  this.collaboratingParticipants = [];
};


/**
 * validate bpmn process definition
 * @param {BPMNParseErrorQueue} errorQueue ErrorQueue
 */
BPMNProcessDefinition.prototype.validate = function validate(errorQueue) {
  var self = this;
  var processElements = this.getProcessElements();

  processElements.forEach(function iterateProcessElements(processElement) {
    if (processElement.validate && typeof processElement.validate === 'function') {
      processElement.validate(self, errorQueue);
    }
  });
};

/**
 * get the incoming sequence flows
 * @param {BPMNFlowObject} flowObject FlowObject
 * @return {[BPMNSequenceFlow]} getIncomingSequenceFlows
 */
BPMNProcessDefinition.prototype.getIncomingSequenceFlows = function getIncomingSequenceFlows(flowObject) {
  return this._getFlows('sequenceFlowByTargetIndex', 'sequenceFlows', flowObject, false);
};

/**
 * Check if flow object has incoming sequence flows
 * @param {BPMNFlowObject} flowObject FlowObject
 * @return {Boolean} hasIncomingSequenceFlows
 */
BPMNProcessDefinition.prototype.hasIncomingSequenceFlows = function hasIncomingSequenceFlows(flowObject) {
  if (flowObject.isCompensationTask === true) {
    return true;
  }
  var outgoingFlows = this.getIncomingSequenceFlows(flowObject);
  return (outgoingFlows.length > 0);
};

/**
 * get the outgoing sequence flows
 * @param {BPMNFlowObject} flowObject FlowObject
 * @return {[BPMNSequenceFlow]} getOutgoingSequenceFlows
 */
BPMNProcessDefinition.prototype.getOutgoingSequenceFlows = function getOutgoingSequenceFlows(flowObject) {
  return this._getFlows('sequenceFlowBySourceIndex', 'sequenceFlows', flowObject, true);
};

/**
 * Check if flow object has outgoing sequence flows
 * @param {BPMNFlowObject} flowObject FlowObject
 * @return {Boolean} hasOutgoingSequenceFlows
 */
BPMNProcessDefinition.prototype.hasOutgoingSequenceFlows = function hasOutgoingSequenceFlows(flowObject) {
  if (flowObject.isCompensationTask === true) {
    return true;
  }
  var outgoingFlows = this.getOutgoingSequenceFlows(flowObject);
  return (outgoingFlows.length > 0);
};

/**
 * get the flow objects
 * @return {[BPMNFlowObject]} getFlowObjects
 */
BPMNProcessDefinition.prototype.getFlowObjects = function getFlowObjects() {
  return this.flowObjects;
};


/**
 * get the process elements
 * @return {[Object]} getProcessElements
 */
BPMNProcessDefinition.prototype.getProcessElements = function getProcessElements() {
  var flowObjects = this.getFlowObjects();
  return (flowObjects.concat(this.sequenceFlows));
};

/**
 * Attach the collaborations participants and message flows to the process definitions for easier access
 * @param {[BPMNCollaborationDefinition]} collaborationDefinition attachCollaborationDefinitions
 */
BPMNProcessDefinition.prototype.attachCollaborationDefinitions = function attachCollaborationDefinitions(collaborationDefinition) {
  var self = this;

  var processParticipant = collaborationDefinition.getParticipantByProcessId(self.bpmnId);

  if (processParticipant) {
    self.name = processParticipant.name;
    var collaboratingParticipants = collaborationDefinition.getCollaboratingParticipants(self.bpmnId);
    self.addCollaboratingParticipants(collaboratingParticipants);
    var messageFlows = collaborationDefinition.getMessageFlows();
    self.addMessageFlows(messageFlows);
  }
};

/**
 * get the participant by participant name
 * @param {String} participantName ParticipantName
 * @return {BPMNParticipant} ParticipantByName
 */
BPMNProcessDefinition.prototype.getParticipantByName = function getParticipantByName(participantName) {
  var participants = this.collaboratingParticipants.filter(function iterateParticipants(participant) {
    return (participant.name === participantName);
  });

  if (participants.length > 1) {
    log.error(log.defaultContext(), "There is more than one collaboration participant having the same name: '" + participantName + "'");
  }

  return participants[0];
};

/**
 * get the collaborating participants
 * @return {[BPMNParticipant]} CollaboratingParticipants
 */
BPMNProcessDefinition.prototype.getCollaboratingParticipants = function getCollaboratingParticipants() {
  return this.collaboratingParticipants;
};

/**
 * add a collaborating participants entry
 * @param {Array.<BPMNParticipant>} participants CollaboratingParticipants
 */
BPMNProcessDefinition.prototype.addCollaboratingParticipants = function addCollaboratingParticipants(participants) {
  var self = this;
  participants.forEach(function iterateParticipants(participant) {
    if (!self.getParticipantByName(participant.name)) {
            // self.collaboratingParticipants.push(participant);
    }
  });
};

/**
 * add message flows entry
 * @param {[BPMNMessageFlow]} messageFlows  MessageFlows
 */
BPMNProcessDefinition.prototype.addMessageFlows = function addMessageFlows(messageFlows) {
  var self = this;

  messageFlows.forEach(function iterateMessageFlows(messageFlow) {
    if (self.getProcessElement(messageFlow.targetRef)) {
      messageFlow.targetProcessDefinitionId = self.bpmnId;
            // self.messageFlows.push(messageFlow);
    } else if (self.getProcessElement(messageFlow.sourceRef)) {
      messageFlow.sourceProcessDefinitionId = self.bpmnId;
            // self.messageFlows.push(messageFlow);
    }
  });
};

/**
 * @return {Object} _buildIndex
 * @private
 */
BPMNProcessDefinition.prototype._buildIndex = function _buildIndex() {
  var index = {};
  var processElements = this.getProcessElements();

  processElements.forEach(function iterateProcessElements(processElement) {
    index[processElement.bpmnId] = processElement;
  });
  return index;
};

/**
 * @param {String} indexName IndexName
 * @param {String} flowContainerName FlowContainerName
 * @param {BPMNFlowObject} flowObject FlowObject
 * @param {Boolean} isOutgoingFlow IsOutgoingFlow
 * @returns {*|Array} Flows
 * @private
 */
BPMNProcessDefinition.prototype._getFlows = function _getFlows(indexName, flowContainerName, flowObject, isOutgoingFlow) {
  if (!this[indexName]) {
    this[indexName] = buildFlowIndex(this[flowContainerName], isOutgoingFlow);
  }
  return (this[indexName][flowObject.bpmnId] || []);
};

/**
 * @param {Boolean} indexBySource If false or undefined, we index by target.
 * @param {Array} flows Flows
 * @return {Object}
 */
 /* jslint latedef:false*/
function buildFlowIndex(flows, indexBySource) {
  var index = {};

  flows.forEach(function iterateFlows(flow) {
    var ref = indexBySource ? flow.sourceRef : flow.targetRef;
    var entry = index[ref];

    if (entry) {
      entry.push(flow);
    } else {
      index[ref] = [flow];
    }
  });
  return index;
}

/**
 * create a bpmn process definition
 * @param {Object} defObject DefinitionObject
 * @constructor
 */
exports.createBPMNProcessDefinition = function createBPMNProcessDefinition(defObject) {
  log.debug(log.defaultContext(), 'BPMNProcessDefinition called');
  return (new BPMNProcessDefinition(defObject));
};

