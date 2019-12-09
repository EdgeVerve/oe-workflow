/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

'use strict';

var logger = require('oe-logger');
var log = logger('Events-Parser');
var BPMNStartEvent = require('./startevents.js');
var BPMNEndEvent = require('./endevents.js');
var BPMNIntermediateEvent = require('./intermediateevents.js');
var BPMNBoundaryEvent = require('./boundaryevents.js');
/**
 * Check if the name is of message event
 * @param {String} localName name without namespace prefix
 * @return {Boolean} isMessageEventName
 */
function isMessageEventName(localName) {
  log.debug(log.defaultContext(), 'isMessageEventName called');

  return (localName === 'messageEventDefinition');
}

/**
 * Check if the name is of Signal event
 * @param {String} localName name without namespace prefix
 * @return {Boolean} isSignalEventName
 */
function isSignalEventName(localName) {
  return (localName === 'signalEventDefinition');
}
/**
 * Check if the name is of Conditional event
 * @param {String} localName name without namespace prefix
 * @returns {boolean} isConditionalEvent
 */
function isConditionalEventName(localName) {
  return (localName === 'conditionalEventDefinition');
}

/**
 * Check if the name is of error event
 * @param {String} localName name without namespace prefix
 * @returns {boolean} isErrorEventName
 */
function isErrorEventName(localName) {
  return (localName === 'errorEventDefinition');
}

/**
 * Check if the name is of escalation event
 * @param {String} localName name without namespace prefix
 * @returns {boolean} isEscalationEvent
 */
function isEscalationEventName(localName) {
  return (localName === 'escalationEventDefinition');
}

/**
 * Check if the name is of timer event
 * @param {String} localName name without namespace prefix
 * @return {Boolean} isTimerEventName
 */
function isTimerEventName(localName) {
  return (localName === 'timerEventDefinition');
}


/**
 * Check if the name is of cancel event
 * @param {String} localName name without namespace prefix
 * @returns {boolean} isCancelEventName
 */
function isCancelEventName(localName) {
  return (localName === 'cancelEventDefinition');
}

/**
 * Check if the name is of compensation event
 * @param {String} localName name without namespace prefix
 * @returns {boolean} isCompensationEventName
 */
function isCompensationEventName(localName) {
  return (localName === 'compensateEventDefinition');
}

/**
 * Check if the name is of terminate event
 * @param {String} localName name without namespace prefix
 * @returns {*} isTerminateEvent
 */
function isTerminateEventName(localName) {
  return (localName.endsWith('terminateEventDefinition'));
}

exports.createBPMNEvent = function createBPMNEvent(defObject) {
  // Every Flow object(Event) is expected to have bpmnId, name and type
  var bpmnId = defObject.attributes_.id.value;
  var name = '';
  if (typeof defObject.attributes_.name !== 'undefined') {
    name = defObject.attributes_.name.value;
  } else {
    /* If node-name is not specified, assume it to be same as bpmnId
     * this is better than simply stopping workflow abruptly */
    name = bpmnId;
  }
  var type = defObject.attributes_ns.local;
  var finalEvent;
  var cancelActivity = '';
  var attachedToRef;

  // We are differentiating between Start, End, Intermediate and Boundary Events
  // If any of the events has a definition is defined, the event object, finalEvent will be populated with
  // defintion in the succeeding For-In loop below.

  if (type.indexOf('start') >= 0 ) {
    finalEvent = BPMNStartEvent.createBPMNStartEvent(bpmnId, name, type);
  } else if (type.indexOf('end') >= 0 ) {
    finalEvent = BPMNEndEvent.createBPMNEndEvent(bpmnId, name, type);
  } else if (type.indexOf('intermediate') >= 0) {
    finalEvent = BPMNIntermediateEvent.createBPMNIntermediateEvent(bpmnId, name, type);
  } else if (type.indexOf('boundary') >= 0) {
    if (defObject.attributes_ && defObject.attributes_.attachedToRef) {
      attachedToRef = defObject.attributes_.attachedToRef.value;
    }
    if (defObject.attributes_ && defObject.attributes_.cancelActivity) {
      cancelActivity = defObject.attributes_.cancelActivity.value;
    }
    finalEvent = BPMNBoundaryEvent.createBPMNBoundaryEvent(bpmnId, name, type,
      attachedToRef, cancelActivity);
  } else {
    log.error(log.defaultContext(), 'This is not a flowObject called');
  }

  // All the Events will have an attribute defining the event defintion of the event
  // Except for the None events every event will have a event Definition
  // Depending on the type of eventDefinitionType, the finalEvent will be assigned respective attributes

  for (var eventDefinition in defObject) {
    if (Object.prototype.hasOwnProperty.call(defObject, eventDefinition) && eventDefinition.indexOf('Definition') >= 0) {
      var eventDefinitionType = defObject[eventDefinition].attributes_ns.local;
      if (isSignalEventName(eventDefinitionType)) {
        finalEvent.isSignalEvent = true;
        if (defObject[eventDefinition].attributes_ && defObject[eventDefinition].attributes_.signalRef) {
          finalEvent.signalId = defObject[eventDefinition].attributes_.signalRef.value;
        }
      } else if (isMessageEventName(eventDefinitionType)) {
        finalEvent.isMessageEvent = true;
        if (defObject[eventDefinition].attributes_ && defObject[eventDefinition].attributes_.messageRef) {
          finalEvent.messageId = defObject[eventDefinition].attributes_.messageRef.value;
        }
      } else if (isErrorEventName(eventDefinitionType)) {
        finalEvent.isErrorEvent = true;
        if (defObject[eventDefinition].attributes_ && defObject[eventDefinition].attributes_.errorRef) {
          finalEvent.errorId = defObject[eventDefinition].attributes_.errorRef.value;
        }
        if (defObject[eventDefinition].attributes_ && defObject[eventDefinition].attributes_.errorCodeVariable) {
          finalEvent.errorCodeVariable = defObject[eventDefinition].attributes_.errorCodeVariable.value;
        }
      } else if (isEscalationEventName(eventDefinitionType)) {
        finalEvent.isEscalationEvent = true;
        if (defObject[eventDefinition].attributes_ && defObject[eventDefinition].attributes_.escalationRef) {
          finalEvent.escalationId = defObject[eventDefinition].attributes_.escalationRef.value;
        }
      } else if (isTimerEventName(eventDefinitionType)) {
        finalEvent.isTimerEvent = true;
        if (defObject[eventDefinition].hasOwnProperty('bpmn2:timeDate')) {
          finalEvent.timeDate = defObject[eventDefinition]['bpmn2:timeDate'].text;
        }
        if (defObject[eventDefinition].hasOwnProperty('bpmn2:timeDuration')) {
          finalEvent.timeDuration = defObject[eventDefinition]['bpmn2:timeDuration'].text;
        }
        if (defObject[eventDefinition].hasOwnProperty('bpmn2:timeCycle')) {
          finalEvent.timeCycle = Number(defObject[eventDefinition]['bpmn2:timeCycle'].text);
        }
      } else if (isCancelEventName(eventDefinitionType)) {
        finalEvent.isCancelEvent = true;
      } else if (isCompensationEventName(eventDefinitionType)) {
        finalEvent.isCompensationEvent = true;
      } else if (isTerminateEventName(eventDefinitionType)) {
        finalEvent.isTerminateEvent = true;
      } else if (isConditionalEventName(eventDefinitionType)) {
        finalEvent.isConditionalEvent = true;
        finalEvent.expression = defObject[eventDefinition]['bpmn2:condition'].text;
        if (defObject[eventDefinition].attributes_ && defObject[eventDefinition].attributes_['camunda:variableName']){
          finalEvent.pvName = defObject[eventDefinition].attributes_['camunda:variableName'].value;
        }  
      }
    }
  }

  return finalEvent;
};
