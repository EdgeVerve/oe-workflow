/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

'use strict';

var xml2js = require('xml2js');
var collaborationDefinition = require('./collaborationdefinition.js');
var BPMNProcessDefinition = require('./processdefinition.js');

/**
 * parse the bpmn xml to populate the process definition
 * @param {String} bpmnXML BpmnXML
 * @param {String} mainProcessName MainProcessName
 * @param {Object} parsercb Callback
 */
exports.parse = function parse(bpmnXML, mainProcessName, parsercb) {
  var Parser = new xml2js.Parser(
    {
      attrkey: 'attributes_',
      charkey: 'text',
      explicitCharkey: true,
      cdata: true,
      explicitArray: false,
      xmlns: true
    });
  var parseXMLString = Parser.parseString;
  var BPMNProcessDefinitions = [];

  parseXMLString(bpmnXML, function cb(err, result) {
    if (err) {
      return parsercb(err, null);
    }
    if (result['bpmn2:definitions'] && result['bpmn2:definitions']['bpmndi:BPMNDiagram']) {
      delete result['bpmn2:definitions']['bpmndi:BPMNDiagram'];
    }
    var rawParsedDefinition = result['bpmn2:definitions'] || result['bpmn:definitions'];
    // Pass the value of the bpmn2:process to the createBPMNProcessDefinition function which will return
    // process bpmnDefinitions
    // Iterate the object of bpmn2:process if it is an array and call createBPMNProcessDefinition on each element
    //
    for (var key in rawParsedDefinition) {
      if (Object.prototype.hasOwnProperty.call(rawParsedDefinition, key)) {
        if (key.indexOf('attributes_') >= 0) {
          continue;
        } else {
          var bpmnprocessDef = rawParsedDefinition[key];
          var processdef;
          if (rawParsedDefinition[key].constructor.name === 'Array') {
            if (key.indexOf('process') >= 0) {
              for (processdef of bpmnprocessDef) {
                BPMNProcessDefinitions.push(BPMNProcessDefinition.createBPMNProcessDefinition(processdef));
              }
            } else if (key.indexOf('collaboration') >= 0 ) {
              for (processdef of bpmnprocessDef) {
                BPMNProcessDefinitions.push(collaborationDefinition.createBPMNCollaborationDefinition(processdef));
              }
            }
          } else if (key.indexOf('process') >= 0) {
            BPMNProcessDefinitions.push(BPMNProcessDefinition.createBPMNProcessDefinition(bpmnprocessDef));
          } else if (key.indexOf('collaboration') >= 0) {
            BPMNProcessDefinitions.push(collaborationDefinition.createBPMNCollaborationDefinition(bpmnprocessDef));
          }
        }
      }
    }

    createEventDefinitionRelation(BPMNProcessDefinitions, rawParsedDefinition);
    return parsercb(null, BPMNProcessDefinitions);
  });
};

function createEventDefinitionRelation(bpmnDefinitions, rawParsedDef) {
  if (typeof bpmnDefinitions !== 'undefined' && bpmnDefinitions.constructor.name === 'Array') {
    for (var definition of bpmnDefinitions) {
      iterateProcessDefinition(definition, rawParsedDef);
    }
  } else if (typeof bpmnDefinitions !== 'undefined' && bpmnDefinitions.constructor.name === 'Object') {
    iterateProcessDefinition(bpmnDefinitions, rawParsedDef);
  }
}

function iterateProcessDefinition(definition, rawParsedDef) {
  var eventObjectMap = {};
  if (definition.isProcessDefinition) {
    if (typeof definition.flowObjects !== 'undefined' && definition.flowObjects.constructor.name === 'Array') {
      for (var flowObject of definition.flowObjects) {
        if (flowObject.type.indexOf('Event') >= 0 || flowObject.type.indexOf('event') >= 0 ) {
          var eventProps = fetchEventname(rawParsedDef, flowObject);
          if (typeof eventProps.type !== 'undefined') {
            var nameAtrribute = eventProps.type + 'Name';
            flowObject[nameAtrribute] = eventProps.name;
            if (eventProps.type === 'error') {
              flowObject.errorCodeVariable = eventProps.code;
              eventObjectMap[eventProps.code] = eventProps.id;
            }
            if (eventProps.type === 'escalation') {
              flowObject.escalationCodeVariable = eventProps.code;
              eventObjectMap[eventProps.code] = eventProps.id;
            }
          }
        }
        if (flowObject.isSubProcess) {
          iterateProcessDefinition(flowObject.processDefinition, rawParsedDef);
        }
      }
    }
    definition.eventObjectMap = eventObjectMap;
  }
}

function fetchEventname(rawParsedDef, flowObject) {
  var eventName = '';
  var eventId;
  var eventType;
  var eventDefObject;
  var eventCode = '';
  if (flowObject.isSignalEvent) {
    eventDefObject = rawParsedDef['bpmn2:signal'] || rawParsedDef['bpmn:signal'];
    eventId = flowObject.signalId;
    eventType = 'signal';
  } else if (flowObject.isMessageEvent) {
    eventDefObject = rawParsedDef['bpmn2:message'] || rawParsedDef['bpmn:message'];
    eventId = flowObject.messageId;
    eventType = 'message';
  } else if (flowObject.isErrorEvent) {
    eventDefObject = rawParsedDef['bpmn2:error'] || rawParsedDef['bpmn:error'];
    eventId = flowObject.errorId;
    eventType = 'error';
  } else if (flowObject.isEscalationEvent) {
    eventDefObject = rawParsedDef['bpmn2:escalation'] || rawParsedDef['bpmn:escalation'];
    eventId = flowObject.escalationId;
    eventType = 'escalation';
  } else {
    return {};
  }
  if (typeof eventDefObject !== 'undefined') {
    if (eventDefObject.constructor.name === 'Array') {
      for (var eventDef of eventDefObject) {
        if (eventDef.attributes_ && eventDef.attributes_.id && eventDef.attributes_.id.value === eventId) {
          if (eventDef.attributes_.name) {
            eventName = eventDef.attributes_.name.value;
          }
          if (eventDef.attributes_.hasOwnProperty('errorCode')) {
            eventCode = eventDef.attributes_.errorCode.value;
          }
          if (eventDef.attributes_.hasOwnProperty('escalationCode')) {
            eventCode = eventDef.attributes_.escalationCode.value;
          }
          break;
        }
      }
    } else if (eventDefObject.constructor.name === 'Object') {
      eventDef = eventDefObject;
      if (eventDef.attributes_ && eventDef.attributes_.id && eventDef.attributes_.id.value === eventId) {
        if (eventDef.attributes_.name) {
          eventName = eventDef.attributes_.name.value;
        }
        if (eventDef.attributes_.hasOwnProperty('errorCode')) {
          eventCode = eventDef.attributes_.errorCode.value;
        }
        if (eventDef.attributes_.hasOwnProperty('escalationCode')) {
          eventCode = eventDef.attributes_.escalationCode.value;
        }
      }
    }
  }
  return {'name': eventName, 'type': eventType, 'id': eventId, 'code': eventCode};
}
