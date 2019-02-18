/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

'use strict';

var BPMNParticipant = require('./participant.js');
var BPMNMessageFlows = require('./messageflows.js');
var logger = require('oe-logger');
var log = logger('Collaboration-Parser');

/**
 * Instantiate a bpmn collaboration definition
 * @param {String} bpmnId BpmnId
 * @param {Array} participants All the participants of the Collaboration
 *  @param {Array} messageFlows All the message flows between the collaborating processes
 * @constructor
 */
function BPMNCollaborationDefinition(bpmnId, participants, messageFlows) {
  this.bpmnId = bpmnId;
  this.participants = participants;
  this.messageFlows = messageFlows;
  this.isCollaborationDefinition = true;
}

/**
 * get a participant by process id
 * @param {String} processBpmnId ProcessBpmnId
 * @return {BPMNParticipant} BPMNParticipant
 */
BPMNCollaborationDefinition.prototype.getParticipantByProcessId = function getParticipantByProcessId(processBpmnId) {
  var participants = this.participants.filter(function filterParticipants(participant) {
    return (participant.processRef === processBpmnId);
  });
  if (participants.length > 1) {
    log.error(log.defaultContext(), "Cannot uniquely assign a pool to the process whith the BPMN ID '" + processBpmnId + "'");
  }
  return participants[0];
};

/**
 * Get all participants the process is collaborating with
 * @param {String} processBpmnId ProcessBpmnId
 * @return {[BPMNParticipant]} BPMNParticipants
 */
BPMNCollaborationDefinition.prototype.getCollaboratingParticipants = function getCollaboratingParticipants(processBpmnId) {
  return this.participants.filter(function filterParticipants(participant) {
    return (participant.processRef !== processBpmnId);
  });
};

/**
 * Get all participants the process is collaborating with
 * @param {String} processBpmnId ProcessBpmnId
 * @return {[BPMNParticipant]} BPMNParticipants
 */
BPMNCollaborationDefinition.prototype.getMessageFlows = function getMessageFlows() {
  return this.messageFlows;
};


/**
 * create a bpmn collaboration definition
 * @param {Object} defObject Raw parsed definition of collaboration process
 * @return {BPMNCollaborationDefinition} BPMNCollaborationDefinition
 */
exports.createBPMNCollaborationDefinition = function createBPMNCollaborationDefinition(defObject) {
  if (typeof defObject !== 'undefined') {
    if (defObject.hasOwnProperty('attributes_') && defObject.attributes_.hasOwnProperty('id')) {
      var bpmnId = defObject.attributes_.id.value;
    }
  }

  var participants = BPMNParticipant.createBPMNParticipant(defObject['bpmn2:participant'] || defObject['bpmn:participant']);
  var messageFlows = BPMNMessageFlows.createBPMNMessageFlow(defObject['bpmn2:messageFlow'] || defObject['bpmn:messageFlow']);
  return (new BPMNCollaborationDefinition(bpmnId, participants, messageFlows));
};


