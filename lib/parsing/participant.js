/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */


'use strict';

var logger = require('oe-logger');
var log = logger('Participant-Parser');

/**
 * Create a bpmn participant
 * @param {String} bpmnId BpmnId
 * @param {String} name Name
 * @param {String} type Type
 * @param {String} processRef ProcessRef
 * @constructor
 */
function BPMNParticipant(bpmnId, name, type, processRef) {
  log.debug(log.defaultContext(), 'BPMNParticipant called');
  this.bpmnId = bpmnId;
  this.name = name;
  this.type = type;
  this.processRef = processRef;
}


/**
 * create an array of all participants in a collaboration definition
 * @param {Object} defObject An array of participants in a collaboration entity
 * @constructor
 */
exports.createBPMNParticipant = function createBPMNParticipant(defObject) {
  var participants = [];
  var bpmnId;
  var name;
  var processRef;
  var type;
  var finalParticipant;
  var participant;
  if (typeof defObject !== 'undefined' && defObject.constructor.name === 'Array') {
    for (participant of defObject) {
      name = '';
      bpmnId = '';
      processRef = null;
      if (participant.hasOwnProperty('attributes_')) {
        if (participant.attributes_.hasOwnProperty('id')) {
          bpmnId = participant.attributes_.id.value;
        }
        if (participant.attributes_.hasOwnProperty('name')) {
          name =  participant.attributes_.name.value;
        }
        if (participant.attributes_.hasOwnProperty('processRef')) {
          processRef =  participant.attributes_.processRef.value;
        }
      }
      if (participant.hasOwnProperty('attributes_ns')) {
        type =  participant.attributes_ns.local;
      }
      finalParticipant = new BPMNParticipant(bpmnId, name, type, processRef);
      participants.push(finalParticipant);
    }
  }
  if (defObject.constructor.name === 'Object') {
    participant = defObject;
    if (participant.hasOwnProperty('attributes_')) {
      if (participant.attributes_.hasOwnProperty('id')) {
        bpmnId = participant.attributes_.id.value;
      }
      if (participant.attributes_.hasOwnProperty('name')) {
        name =  participant.attributes_.name.value;
      }
      if (participant.attributes_.hasOwnProperty('processRef')) {
        processRef =  participant.attributes_.processRef.value;
      }
    }
    if (participant.hasOwnProperty('attributes_ns')) {
      type =  participant.attributes_ns.local;
    }
    finalParticipant = new BPMNParticipant(bpmnId, name, type, processRef);
    participants.push(finalParticipant);
  }
  return participants;
};


