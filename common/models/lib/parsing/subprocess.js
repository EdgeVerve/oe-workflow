/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

'use strict';

var util = require('util');
var BPMNActivity = require('./activity.js').BPMNActivity;
var BPMNCallActivity = require('./callactivity.js').BPMNCallActivity;
var checkAndAddMultiInstanceCharacteristics = require('./taskmarkers.js').checkAndAddMultiInstanceCharacteristics;
var extractInputOutputParameters = require('./parse-utils/input-output-parameters.js').extractInputOutputParameters;

var logger = require('oe-logger');
var log = logger('SubProcess-Parser');

var BPMNSubProcess;

/**
 * create a bpmn sub process
 * @param {Object} flowObject FlowObject
 * @param {BPMNProcessDefinition} subProcessDefinition SubProcessDefinition
 * @return {BPMNSubProcess} createBPMNSubProcess
 */
exports.createBPMNSubProcess = function createBPMNSubProcess(flowObject, subProcessDefinition) {
  var bpmnId = flowObject.attributes_.id.value;
  var name = '';
  var triggeredByEvent;
  if (typeof flowObject.attributes_.name !== 'undefined') {
    name = flowObject.attributes_.name.value;
  }
  var type = flowObject.attributes_ns.local;
  if (flowObject.attributes_ && flowObject.attributes_.triggeredByEvent) {
    triggeredByEvent = flowObject.attributes_.triggeredByEvent.value;
  }
  var subprocessObject = new BPMNSubProcess(bpmnId, name, type, triggeredByEvent, subProcessDefinition);
  checkAndAddMultiInstanceCharacteristics(flowObject, subprocessObject);
  if (flowObject['bpmn2:extensionElements'] && flowObject['bpmn2:extensionElements']['camunda:inputOutput']) {
    subprocessObject.inputOutputParameters = extractInputOutputParameters(flowObject['bpmn2:extensionElements']['camunda:inputOutput']);
  }
  return subprocessObject;
};

/**
 * Check if the name is of sub process
 * @param {String} localName name without namespace prefix
 * @return {Boolean} isSubProcessName
 */
exports.isSubProcessName = function isSubProcessName(localName) {
  return (localName.toLowerCase().indexOf('subprocess') > -1 || localName.toLowerCase().indexOf('transaction') > -1);
};

exports.isTransactionSubProcess = function isTransactionSubProcess(localName) {
  return (localName.toLowerCase().indexOf('transaction') > -1);
};

/**
 * Subsumes all kind of tasks
 * @param {String} bpmnId BpmnId
 * @param {String} name Name
 * @param {String} type Type
 * @param {*} triggeredByEvent TriggeredByEvent
 * @param {BPMNProcessDefinition} subProcessDefinition SubProcessDefinition
 * @constructor
 */
BPMNSubProcess = exports.BPMNSubProcess = function BPMNSubProcess(bpmnId, name, type, triggeredByEvent, subProcessDefinition) {
  log.debug(log.defaultContext(), 'BPMNSubProcess called');
  BPMNActivity.call(this, bpmnId, name, type);
  this.isSubProcess = true;
  this.triggeredByEvent = triggeredByEvent;
  this.isMultiInstanceLoop = false;
  this.isSequential = false;
  this.processDefinition = subProcessDefinition;
};
util.inherits(BPMNSubProcess, BPMNActivity);


/**
 * If we are to enter a called processing (returningFromSubProcess = false), the called process is
 *            created and a token is put onto its start state. If we leave the subProcess we just emit a token.
 * @param {BPMNProcess} currentProcess CurrentProcess
 * @param {Object} data Data
 * @param {Function} createBPMNProcess createBPMNProcess
 * @param {Boolean=} returningFromCalledProcess ReturningFromCalledProcess
 */
BPMNSubProcess.prototype.emitTokens = function emitTokens(currentProcess, data, createBPMNProcess, returningFromCalledProcess) {
    // A sub-process is a special case of a call activity:
    // the process is defined inline instead of being defined in another file
  BPMNCallActivity.prototype.emitTokens.call(this, currentProcess, data, createBPMNProcess, returningFromCalledProcess);
};

/**
 * create a called process
 * @param {Token} callActivityToken CallActivityToken
 * @param {BPMNProcess} currentProcess CurrentProcess
 * @param {Function} createBPMNProcess CreateBPMNProcess
 * @param {Function} callback Callback
 */
BPMNSubProcess.prototype.createCalledProcess = function createCalledProcess(callActivityToken, currentProcess, createBPMNProcess, callback) {
  var processDefinition = this.processDefinition;
    // A sub-process is a special case of a call activity:
    // the process is defined inline instead of being defined in another file
  BPMNCallActivity.prototype.createCalledProcess.call(
        this, callActivityToken, currentProcess, createBPMNProcess, processDefinition, callback);
};


/**
 * validate assertions for name and sequence flows
 * @param {BPMNProcessDefinition} processDefinition ProcessDefinition
 * @param {BPMNParseErrorQueue} errorQueue ErrorQueue
 */
BPMNSubProcess.prototype.validate = function validate(processDefinition, errorQueue) {
  this.assertName(errorQueue);
  if (this.triggeredByEvent === 'true') {
    return;
  }
  this.assertIncomingSequenceFlows(processDefinition, errorQueue);
  this.assertOutgoingSequenceFlows(processDefinition, errorQueue);
};
