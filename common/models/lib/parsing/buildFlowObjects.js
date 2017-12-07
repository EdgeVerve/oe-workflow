/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

var BPMNTask = require('./tasks.js');
var BPMNEvent = require('./events.js');
var BPMNSequenceFlow = require('./sequenceflows.js');
var BPMNSubProcess = require('./subprocess.js');
var BPMNProcessDefinition = require('./processdefinition.js');
var BPMNLane = require('./lanes.js');
var BPMNGateway = require('./gateways.js');
var BPMNCallActivity = require('./callactivity.js');

var logger = require('oe-logger');
var log = logger('Build-Flow-Objects-Parser');


function createFlowObject(flowObject, processElements) {
  var finalFlowObject;
  var finalSequenceFlow;
  var finalLaneObject;
  var flowObjectBpmnId;
  var flowObjectType;

  var flowObjectName = '';
  if (flowObject.attributes_ && flowObject.attributes_.id) {
    flowObjectBpmnId = flowObject.attributes_.id.value;
  }
  if (flowObject.attributes_ && typeof flowObject.attributes_.name !== 'undefined') {
    flowObjectName = flowObject.attributes_.name.value;
  }
  if (flowObject.attributes_ns) {
    flowObjectType = flowObject.attributes_ns.local;
  }
  if (flowObjectType.indexOf('Task') >= 0) {
    finalFlowObject = BPMNTask.createBPMNTask(flowObjectBpmnId, flowObjectName, flowObjectType, flowObject);
    processElements.flowObjects.push(finalFlowObject);
  } else if (flowObjectType.indexOf('Event') >= 0) {
    finalFlowObject = BPMNEvent.createBPMNEvent(flowObject);
    processElements.flowObjects.push(finalFlowObject);
  } else if (flowObjectType.indexOf('Flow') >= 0) {
    finalSequenceFlow = BPMNSequenceFlow.createBPMNSequenceFlow(flowObject);
    processElements.sequenceFlows.push(finalSequenceFlow);
  } else if (flowObjectType.indexOf('subProcess') >= 0) {
    var subprocessDefinition = BPMNProcessDefinition.createBPMNProcessDefinition(flowObject);
    finalFlowObject = BPMNSubProcess.createBPMNSubProcess(flowObject, subprocessDefinition);
    processElements.flowObjects.push(finalFlowObject);
  } else if (flowObjectType.indexOf('call') >= 0) {
    finalFlowObject = BPMNCallActivity.createBPMNCallActivity(flowObject);
    processElements.flowObjects.push(finalFlowObject);
  // } else if (flowObjectType.indexOf('association') >= 0) {
  //   finalassociation = BPMNAssociation.createBPMNAssociationElement(flowObject);
  //   processElements.associations.push(finalassociation);
  } else if (flowObjectType.indexOf('laneSet') >= 0) {
    finalLaneObject = BPMNLane.createBPMNLane(flowObject);
    processElements.lanes = finalLaneObject;
  } else if (flowObjectType.indexOf('Gateway') > 0) {
    finalFlowObject = BPMNGateway.createBPMNGateway(flowObject);
    processElements.flowObjects.push(finalFlowObject);
  }
}


/**
 * Subsumes all kind process elements that have incoming and outgoing flows.
 * Name according to http://de.wikipedia.org/wiki/Business_Process_Model_and_Notation#Notation
 * @param {Array} defObject Parsed array of flow objects of a process
 * @returns {Object} processElements
 */
exports.createFlowObjects = function createFlowObjects(defObject) {
    // Iterate through all the keys of bpmn2:process
    // If the key is not attributes_ or attributes_ns then
    // Check if it an Array of objects or a simple object
    // If it is an array of objects iterate through each of the objects and call createBPMNFlowObject function
    // or else directly call teh function on the simple object
    // handling of subprocess is take
  var processElements = {
    flowObjects: [],
    sequenceFlows: [],
    associations: [],
    lanes: []
  };
  var flowObject;
  for (var flowObjectKey in defObject) {
    if (flowObjectKey.indexOf('attributes') >= 0) {
      continue;
    }
    if (defObject[flowObjectKey].constructor.name === 'Array') {
      for (var element of defObject[flowObjectKey]) {
        flowObject = element;
        createFlowObject(flowObject, processElements);
      }
    } else if (defObject[flowObjectKey].constructor.name === 'Object') {
      flowObject = defObject[flowObjectKey];
      createFlowObject(flowObject, processElements);
    } else {
      log.error(log.defaultContext(), 'Flow object is neither array nor object');
    }
  }
  return processElements;
};
