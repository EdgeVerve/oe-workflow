/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
/**
 * @description FlowObject Evaluator
 * @author Kangan Verma(kangan06), Mandeep Gill(mandeep6ill), Prem Sai(premsai-ch), Vivek Mittal(vivekmittal07)
 */

var sandbox = require('./sandbox.js');
var serviceNode = require('./service-node.js');
var businessRuleTaskHandler = require('./businessruletask-node.js').businessRuleTaskHandler;
var evaluatePayload = require('./businessruletask-node.js').evaluatePayload;
var _ = require('lodash');


var logger = require('oe-logger');
var log = logger('EvaluateFlowObject');

module.exports.evaluate = function EvaluateFO(options, flowObject, incomingMsg, process, delta, token, done) {
  log.debug(options, 'Event Name : ' + flowObject.name);

  var script = flowObject.script;
  var service = flowObject.serviceTask;
  var stepVariables = {};
  if (flowObject.isWaitTask) {
    return done(null, incomingMsg);
  } else if (flowObject.isStartEvent && flowObject.isMessageEvent) {
    return done(null, incomingMsg);
  } else if (script) {
    var scriptVariables = incomingMsg || {};
    if (flowObject.inputOutputParameters && flowObject.inputOutputParameters.inputParameters)      {
      stepVariables = evaluatePayload(flowObject.inputOutputParameters.inputParameters, message, process);
      _.assign(scriptVariables, stepVariables);
    }
    var message = sandbox.evaluateScript(options, script, scriptVariables, process, delta, token);
    return done(null, message);
  } else if (service) {
    var serviceVariables = incomingMsg || {};
    if (flowObject.inputOutputParameters && flowObject.inputOutputParameters.inputParameters)      {
      stepVariables = evaluatePayload(flowObject.inputOutputParameters.inputParameters, message, process);
      _.assign(serviceVariables, stepVariables);
    }
    serviceNode.run(options, flowObject, serviceVariables, process, token, done);
  } else if (flowObject.businessRuleTask) {
    businessRuleTaskHandler(flowObject.ruleName, flowObject.inputOutputParameters.inputParameters, message, process, options, done);
  } else if (flowObject.type === 'sendTask') {
    process.processDefinition({}, options, function fetchPD(err, processDefinitionInstance) {
      if (err) {
        log.error(options, err);
        return done(err);
      }
      var externalMessageFlows = getExternalMessageFlows(flowObject, processDefinitionInstance);
      if (externalMessageFlows.length > 0) {
        externalMessageHandling(externalMessageFlows, process, options, incomingMsg, done);
      } else {
        done(null, incomingMsg);
      }
    });
  } else {
    return done(null, incomingMsg);
  }
};

/**
 * Handling for External Message passing
 * @param  {Object} externalMessageFlows ExternalMessageFlows
 * @param  {Object} processInstance Process-Instance
 * @param  {Object} options Options
 * @param  {Object} incomingMsg Message
 * @param  {Function} done Callback
 */
var externalMessageHandling = function externalMessageHandling(externalMessageFlows, processInstance, options, incomingMsg, done) {
  processInstance.workflowInstance({}, options, function cb(err, workflowI) {
    if (err) {
      log.error(options, err);
      return done(err);
    }
    for (var i in externalMessageFlows) {
      if (Object.prototype.hasOwnProperty.call(externalMessageFlows, i)) {
        workflowI.passInternalMessage(externalMessageFlows[i].targetProcessDefinitionId, externalMessageFlows[i].targetRef, options, incomingMsg);
      }
    }
    done(null, incomingMsg);
  });
};

/**
 * Fetch External Message Flows
 * @param  {Object} flowObject FlowObject
 * @param  {Object} processDefinition Process-Definition
 * @returns {Object} ExternalMessageFlows
 */
var getExternalMessageFlows = function getExternalMessageFlows(flowObject, processDefinition) {
  var externalMessageFlows = processDefinition._getFlows('messageFlowBySourceIndex', flowObject);
  var externalMessageFlowsFilter = [];
  for (var i in externalMessageFlows) {
    if (externalMessageFlows[i].isExternal) {
      externalMessageFlowsFilter.push(externalMessageFlows[i]);
    }
  }
  return externalMessageFlowsFilter;
};
