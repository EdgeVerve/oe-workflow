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
 * Check if the name is of process
 * @param {String} localName name without namespace prefix
 * @return {Boolean} isProcessName
 */
exports.isProcessName = function isProcessName(localName) {
  return (localName === 'process');
};

/**
 * Check if  node is executable
 * @param {Object} node Node
 * @return {Boolean} isExecutable
 */
exports.isExecutable = function isExecutable(node) {
  var isExecutable = parserUtils.getAttributesValue(node, 'isExecutable');
  return (!isExecutable || isExecutable === 'true');
};

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
 * get the process element
 * @param {String} bpmnId BpmnId
 * @return {*} getProcessElement
 */
BPMNProcessDefinition.prototype.getProcessElement = function getProcessElement(bpmnId) {
  if (!(this.processElementIndex)) {
    this.processElementIndex = this._buildIndex();
  }

  return this.processElementIndex[bpmnId];
};

/**
 * get the flow object
 * @param {String} bpmnId BpmnId
 * @return {BPMNFlowObject} getFlowObject
 */
BPMNProcessDefinition.prototype.getFlowObject = function getFlowObject(bpmnId) {
  return this.getProcessElement(bpmnId);
};

/**
 * get the source flow object
 * @param {{sourceRef: String}} flow Flow
 * @return {BPMNFlowObject} getSourceFlowObject
 */
BPMNProcessDefinition.prototype.getSourceFlowObject = function getSourceFlowObject(flow) {
  return this.getProcessElement(flow.sourceRef);
};

/**
 * get the start events
 * @return {[BPMNActivity]} getStartEvents
 */
exports.getStartEvents = function getStartEvents() {
  return this.flowObjects.filter(function iterateFlowObjects(flowObject) {
    return (flowObject.isStartEvent);
  });
};

/**
 * get the boundary events
 * @return {[BPMNActivity]} getBoundaryEvents
 */
BPMNProcessDefinition.prototype.getBoundaryEvents = function getBoundaryEvents() {
  return this.flowObjects.filter(function iterateFlowObjects(flowObject) {
    return (flowObject.isBoundaryEvent);
  });
};

/**
 * get the the boundary events at bpmn id
 * @param {BPMNActivity} activity Activity
 * @return {[BPMNActivity]} getBoundaryEventsAt
 */
BPMNProcessDefinition.prototype.getBoundaryEventsAt = function getBoundaryEventsAt(activity) {
  if (!this.boundaryEventsByAttachmentIndex) {
    this.boundaryEventsByAttachmentIndex = this.buildBoundaryEventsByAttachmentIndex();
  }
  return (this.boundaryEventsByAttachmentIndex[activity.bpmnId] || []);
};

/*
 * build boundary events by attachment index
 */
BPMNProcessDefinition.prototype.buildBoundaryEventsByAttachmentIndex = function buildBoundaryEventsByAttachmentIndex() {
  var index = {};
  var self = this;
  var boundaryEvents = this.getBoundaryEvents();

  boundaryEvents.forEach(function iterateBoundaryEvents(boundaryEvent) {
    var attachedToRef = boundaryEvent.attachedToRef;
    var activity = self.getFlowObject(attachedToRef);

    if (activity) {
      if (activity.isWaitTask || activity.isSubProcess || activity.isInsideTransaction) {
        var entry = index[attachedToRef];
        if (entry) {
          entry.push(boundaryEvent);
        } else {
          index[attachedToRef] = [boundaryEvent];
        }
      } else {
        log.error(log.defaultContext(), "The activity '" + activity.name + "' has a boundary event but this is allowed only for wait tasks such as user or receive tasks.");
      }
    } else {
      log.error(log.defaultContext(), "Cannot find the activity the boundary event '" + boundaryEvent.name +
                "' is attached to (activity BPMN ID: '" + boundaryEvent.attachedToRef + "'.");
    }
  });

  return index;
};

/**
 * get the flow object name
 * @param {String} name Name
 * @return {BPMNFlowObject} getFlowObjectByName
 */
BPMNProcessDefinition.prototype.getFlowObjectByName = function getFlowObjectByName(name) {
  var bpmnId = this.getIdByName(name);
  return this.getFlowObject(bpmnId);
};

/**
 * get the id by name
 * @param {String} name Name
 * @return {String} getIdByName
 */
BPMNProcessDefinition.prototype.getIdByName = function getIdByName(name) {
  if (!(this.nameMap)) {
    this.nameMap = buildNameMap(this.getFlowObjects());
  }
  return this.nameMap[name];
};

/**
 * get the nextt flow objects
 * @param {BPMNFlowObject} flowObject FlowObject
 * @return {Array.<BPMNFlowObject>} getNextFlowObjects
 */
BPMNProcessDefinition.prototype.getNextFlowObjects = function getNextFlowObjects(flowObject) {
  var nextFlowObjects = [];
  var self = this;
  var outgoingSequenceFlows = this.getOutgoingSequenceFlows(flowObject);

  outgoingSequenceFlows.forEach(function iterateOutgoingSequenceFlows(flow) {
    nextFlowObjects.push(self.getProcessElement(flow.targetRef));
  });
  return nextFlowObjects;
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
 * add a sequence flow entry
 * @param {BPMNSequenceFlow} sequenceFlow SequenceFlow
 */
BPMNProcessDefinition.prototype.addSequenceFlow = function addSequenceFlow(sequenceFlow) {
  this.sequenceFlowBySourceIndex = null;
  this.sequenceFlowByTargetIndex = null;
  this.sequenceFlows.push(sequenceFlow);
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
 * Add a flow object entry
 * @param {BPMNFlowObject} flowObject FlowObject
 */
BPMNProcessDefinition.prototype.addFlowObject = function addFlowObject(flowObject) {
  this.processElementIndex = null;
  this.nameMap = null;
  this.boundaryEventsByAttachmentIndex = null;
  this.flowObjects.push(flowObject);
};

/**
 * get the flow objects
 * @return {[BPMNFlowObject]} getFlowObjects
 */
BPMNProcessDefinition.prototype.getFlowObjects = function getFlowObjects() {
  return this.flowObjects;
};

/**
 * add an association entry
 * @param {Object} association Association
 */
BPMNProcessDefinition.prototype.addAssociations = function addAssociations(association) {
  this.associations.push(association);
};

/**
 * get associations
 * @returns {Array} Associations
 */
BPMNProcessDefinition.prototype.getAssociations = function getAssociations() {
  return this.associations;
};
BPMNProcessDefinition.prototype.addLane = function addLane(lane) {
  this.lanes.push(lane);
};

BPMNProcessDefinition.prototype.getLanes = function getLanes() {
  return this.lanes;
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
 * get the participant by participant id
 * @param {String} processDefinitionId ProcessDefinitionId
 * @return {BPMNParticipant} ParticipantById
 */
BPMNProcessDefinition.prototype.getParticipantById = function getParticipantById(processDefinitionId) {
  var participants = this.collaboratingParticipants.filter(function iterateParticipants(participant) {
    return (participant.processRef === processDefinitionId);
  });
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
 * get the incoming message flows
 * @param {BPMNFlowObject} flowObject FlowObject
 * @return {[BPMNMessageFlow]} IncomingMessageFlows
 */
BPMNProcessDefinition.prototype.getIncomingMessageFlows = function getIncomingMessageFlows(flowObject) {
  return this._getFlows('messageFlowByTargetIndex', 'messageFlows', flowObject, false);
};

/**
 * get the outgoing message flows
 * @param {BPMNFlowObject} flowObject FlowObject
 * @return {[BPMNMessageFlow]} OutgoingMessageFlows
 */
BPMNProcessDefinition.prototype.getOutgoingMessageFlows = function getOutgoingMessageFlows(flowObject) {
  return this._getFlows('messageFlowBySourceIndex', 'messageFlows', flowObject, true);
};

/**
 * get the message flows by flowb object name
 * @param {String} flowObjectName FlowObjectName
 * @return {[BPMNMessageFlow]} MessageFlowsBySourceName
 */
BPMNProcessDefinition.prototype.getMessageFlowsBySourceName = function getMessageFlowsBySourceName(flowObjectName) {
  var flowObject = this.getFlowObjectByName(flowObjectName);
  return this.getOutgoingMessageFlows(flowObject);
};

BPMNProcessDefinition.prototype.getRestEndPoint = function getRestEndPoint(currentActivity) {
  var flowObject = this.getFlowObjectByName(currentActivity);
  return JSON.parse(flowObject.restEndpoint);
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
 * build name for map
 * @param {[{name: string, bpmnId: string}]} objects Objects name and bpmid
 * @return {Object} buildNameMapObjects
 * @private
 */
function buildNameMap(objects) {
  var map = {};

  objects.forEach(function iterateObjects(object) {
    var name = object.name;

    if (map[name]) {
      log.error(log.defaultContext(), "Process element name '" + name + "' must be unique.");
    } else {
      map[name] = object.bpmnId;
    }
  });

  return map;
}

/**
 * add data object reference
 * @param {Object} dataObjectReference DataObjectReference
 */
BPMNProcessDefinition.prototype.addDataObjectReference = function addDataObjectReference(dataObjectReference) {
  this.dataObjectReferences.push(dataObjectReference);
};

/**
 * get data object reference
 * @returns {*|Array} DataObjectReferences
 */
BPMNProcessDefinition.prototype.getDataObjectReferences = function getDataObjectReferences() {
  return this.dataObjectReferences;
};

/**
 * get event sub processes
 * @returns {Array.<*>} EventSubProcesses
 */
BPMNProcessDefinition.prototype.getEventSubProcesses = function getEventSubProcesses() {
  return this.flowObjects.filter(function iterateFlowObjects(flowObject) {
    return (flowObject.isSubProcess && flowObject.triggeredByEvent === 'true');
  });
};

/**
 * get the transaction sub processes
 * @returns {Array.<*>} TransactionSubProcesses
 */
BPMNProcessDefinition.prototype.getTransactionSubProcesses = function getTransactionSubProcesses() {
  return this.flowObjects.filter(function iterateFlowObjects(flowObject) {
    return (flowObject.isSubProcess && flowObject.type === 'transaction');
  });
};


/**
 * create a bpmn process definition
 * @param {Object} defObject DefinitionObject
 * @constructor
 */
exports.createBPMNProcessDefinition = function createBPMNProcessDefinition(defObject) {
  log.debug(log.defaultContext(), 'BPMNProcessDefinition called');
  return (new BPMNProcessDefinition(defObject));
};

