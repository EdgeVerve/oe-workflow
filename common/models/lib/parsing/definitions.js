/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

'use strict';

var parser = require('./parser.js');
var errors = require('./errors.js');
var logger = require('oe-logger');
var log = logger('Definition-Parser');

var bpmnDefinitionsCache = {};
var getBPMNProcessDefinitions;

/**
 * Clear the cache
 */
exports.clearCache = function clearCache() {
  bpmnDefinitionsCache = {};
};


/**
 * get one bpmn process definition from file path
 * @param {String} bpmnFilePath BpmnFilePath
 * @return {BPMNProcessDefinition} BPMNProcessDefinition
 */
exports.getBPMNProcessDefinition = function getProcessDefinitions(bpmnFilePath) {
  var processDefinition;
  var processDefinitions = getBPMNProcessDefinitions(bpmnFilePath);

  if (processDefinitions.length === 1) {
    processDefinition = processDefinitions[0];
  } else {
    log.error(log.defaultContext(), "The BPMN file '" + bpmnFilePath + "'. contains more than one process definition. Use 'getBPMNProcessDefinitions' instead of 'getBPMNProcessDefinition'");
  }
  return processDefinition;
};

/**
 * get the bpmn process definitions from the file path
 * @param {String} bpmnFilePath BpmnFilePath
 * @return {[BPMNProcessDefinition]} BPMNProcessDefinition
 */
getBPMNProcessDefinitions = exports.getBPMNProcessDefinitions = function getBPMNProcessDefinitions(bpmnFilePath) {
  var bpmnDefinitions = getCachedBPMNDefinitions(bpmnFilePath);
  return getProcessDefinitions(bpmnDefinitions);
};

/**
 * get bpmn collaborations definitions from file path
 * @param {String} bpmnFilePath BpmnFilePath
 * @return {[BPMNCollaborationDefinition]} BPMNCollaborationDefinition
 */
exports.getBPMNCollaborationDefinitions = function getBPMNCollaborationDefinitions(bpmnFilePath) {
  var bpmnDefinitions = getCachedBPMNDefinitions(bpmnFilePath);
  return getCollaborationDefinitions(bpmnDefinitions);
};

/**
 * Get Collaboration Definitions
 * @param {Object} bpmnDefinitions BPMNProcessDefinition
 * @returns {[*]} any
 */
function getCollaborationDefinitions(bpmnDefinitions) {
  if (!bpmnDefinitions) {
    return;
  }
  var defs =  bpmnDefinitions.filter(function filterDefns(definition) {
    return definition.isCollaborationDefinition;
  });
  return defs[0];
}

/**
 * Get Process Definitions
 * @param {Object} bpmnDefinitions BPMNProcessDefinition
 * @returns {[*]} any
 */
function getProcessDefinitions(bpmnDefinitions) {
  if (!bpmnDefinitions) {
    return;
  }
  return bpmnDefinitions.filter(function filterDefns(definition) {
    return definition.isProcessDefinition;
  });
}

/**
 * We don't read bpmn files asynchronously (like node is loading js-files also synchronously),
 * thus we have to cache the definitions.
 * @param {String} bpmnFilePath BpmnFilePath
 * @return {[*]} Definition
 */
function getCachedBPMNDefinitions(bpmnFilePath) {
  var bpmnDefinitions = bpmnDefinitionsCache[bpmnFilePath];

  if (!bpmnDefinitions) {
    // bpmnDefinitions = getBPMNDefinitions(bpmnFilePath);
    // bpmnDefinitionsCache[bpmnFilePath] = bpmnDefinitions;
  }

  return bpmnDefinitions;
}
exports.getCachedBPMNDefinitions = getCachedBPMNDefinitions;

function removeCachedBPMNDefinitions(bpmnFilePath) {
  var bpmnDefinitions = bpmnDefinitionsCache[bpmnFilePath];

  if (bpmnDefinitions) {
    delete bpmnDefinitionsCache[bpmnFilePath];
  }
}
exports.removeCachedBPMNDefinitions = removeCachedBPMNDefinitions;


/**
 * Set the collaboration definitions
 * @param {Object} bpmnDefinitions BPMNProcessDefinition
 */
function setCollaborationDefinitions(bpmnDefinitions) {
  var collaborationDefinition = getCollaborationDefinitions(bpmnDefinitions);

  if (!collaborationDefinition) {
    return;
  }
  var processDefinitions = getProcessDefinitions(bpmnDefinitions);
  var errorQueue = errors.createBPMNParseErrorQueue();
  processDefinitions.forEach(function iteratePDs(processDefinition) {
    processDefinition.validate(errorQueue);
    errorQueue.check();
    processDefinition.attachCollaborationDefinitions(collaborationDefinition);
  });
}

/**
 * Get bpmn definitions from xml
 * @param {String} bpmnXML BpmnXML
 * @param {String} mainProcessName mainProcessName
 * @param {String} cb Callback
 */
function getBPMNDefinitionsFromXML(bpmnXML, mainProcessName, cb) {
  parser.parse(bpmnXML, mainProcessName, function parsercb(err, parsedDef) {
    if (err) {
      log.error(log.defaultContext(), 'The bpmn file is unable to be parsed');
      return cb(err, null);
    }
    setCollaborationDefinitions(parsedDef);
    var defs = {};
    defs.collaborationDef = getCollaborationDefinitions(parsedDef);
    defs.processDefinitions = getProcessDefinitions(parsedDef);
    return cb(null, defs);
  });
}
exports.getBPMNDefinitionsFromXML = getBPMNDefinitionsFromXML;
