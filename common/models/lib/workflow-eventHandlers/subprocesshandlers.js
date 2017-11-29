/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
/**
 * @description SubProcess Event Handler
 * @author Kangan Verma(kangan06), Mandeep Gill(mandeep6ill), Prem Sai(premsai-ch), Vivek Mittal(vivekmittal07)
 */

var logger = require('oe-logger');
var log = logger('ProcessInstance');
var StateDelta = require('../../process-state-delta.js');
var sandbox = require('../workflow-nodes/sandbox.js');

var recrevaluatePayload = require('../workflow-nodes/businessruletask-node.js').evaluatePayload;
var SUBPROCESS_INTERRUPT_EVENT = 'SUBPROCESS_INTERRUPT_EVENT';
var TASK_INTERRUPT_EVENT = 'TASK_INTERRUPT_EVENT';

var exports = module.exports = {};

exports._subProcessEndEventHandler = function _subProcessEndEventHandler(options, currentProcess, token, processVariables) {
  var mappedVariables = {};
  var delta = new StateDelta();
  currentProcess.processDefinition({}, options, function fetchPD(err, processDefinitionInstance) {
    if (err) {
      log.error(options, err);
      return;
    }

    var currentFlowObject = processDefinitionInstance.getFlowObjectByName(token.name);

    // Map the required process variables to call activity
    if (currentFlowObject.isCallActivity) {
      if (currentFlowObject.inOutMappings && currentFlowObject.inOutMappings.outputMappings) {
        var outputMappings = currentFlowObject.inOutMappings.outputMappings;
        for (var source in outputMappings) {
          if (source === 'variables' && outputMappings[source] === 'all') {
            Object.assign(mappedVariables, processVariables);
          } else if (source in processVariables) {
            source = sandbox.evaluate$Expression(options, source, token.message, currentProcess);
            var target = outputMappings[source];
            if (typeof processVariables[source] === 'object') {
              mappedVariables[target] = {};
              Object.assign(mappedVariables[target], processVariables[source]);
            } else {
              mappedVariables[target] = processVariables[source];
            }
          }
        }
      } else {
        Object.assign(mappedVariables, processVariables);
      }
    }
    if (currentFlowObject.inputOutputParameters && currentFlowObject.inputOutputParameters.outputParameters) {
      var outputParameters = currentFlowObject.inputOutputParameters.outputParameters;
      var evalInput = recrevaluatePayload(outputParameters, token.message, currentProcess);
      Object.assign(mappedVariables, evalInput);
    }

    delta.setProcessVariables(mappedVariables);
    setImmediate(function setImmediateCb(options) {
      currentProcess._endFlowObject(options, token, processDefinitionInstance, delta);
    }, options);
  });
};

exports._terminateInterruptHandler = function _terminateInterruptHandler(options, ProcessInstance, currentProcess, done) {
  currentProcess.subProcesses({}, options, function fetchSubProcesses(err, subProcesses) {
    if (err) {
      log.error(options, err);
      return;
    }
    for (var i in subProcesses) {
      if (Object.prototype.hasOwnProperty.call(subProcesses, i)) {
        ProcessInstance.emit(SUBPROCESS_INTERRUPT_EVENT, options, ProcessInstance, subProcesses[i]);
      }
    }
  });
};

exports._subProcessInterruptHandler = function _subProcessInterruptHandler(options, ProcessInstance, currentProcess) {
  var delta = new StateDelta();
  delta.setProcessStatus('interrupted');
  currentProcess.commit(options, delta, function commitCb(err) {
    if (err) {
      log.error(options, err);
      return;
    }
  });

  var _options = JSON.parse(JSON.stringify(options));
  _options._skip_tf = true;

  currentProcess.tasks({}, _options, function fetchTasks(err, tasks) {
    if (err) {
      log.error(options, err);
      return;
    }
    for (var i in tasks) {
      if (Object.prototype.hasOwnProperty.call(tasks, i)) {
        ProcessInstance.app.models.Task.emit(TASK_INTERRUPT_EVENT, options, ProcessInstance.app.Task, tasks[i]);
      }
    }

    currentProcess.subProcesses({}, options, function fetchSubProcesses(err, subProcesses) {
      if (err) {
        log.error(options, err);
        return;
      }
      for (var i in subProcesses) {
        if (Object.prototype.hasOwnProperty.call(subProcesses, i)) {
          ProcessInstance.emit(SUBPROCESS_INTERRUPT_EVENT, options, ProcessInstance, subProcesses[i]);
        }
      }
    });
  });
};
