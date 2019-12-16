/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
/**
 * @description Token Event Handler for Workflow
 * @author Kangan Verma(kangan06), Mandeep Gill(mandeep6ill), Prem Sai(premsai-ch), Vivek Mittal(vivekmittal07)
 */

var logger = require('oe-logger');
var log = logger('ProcessInstance-TokenEventHandler');
var throwObject = require('../utils/throwobject.js');
var StateDelta = require('../utils/process-state-delta.js');
var flowObjectEvaluator = require('../workflow-nodes/evaluate-flow-object.js');
var dateUtils = require('../utils/oe-date-utils.js');
var timeoutCalculator = require('../utils/timeout-calculator.js');
var sandbox = require('../workflow-nodes/sandbox.js');
var recrevaluatePayload = require('../workflow-nodes/businessruletask-node.js').evaluatePayload;
var _ = require('lodash');

var INTERMEDIATE_CATCH_EVENT = 'INTERMEDIATE_CATCH_EVENT';
var TERMINATE_INTERRUPT_EVENT = 'TERMINATE_INTERRUPT_EVENT';

var exports = module.exports = {};

function _executeTimerEvent(options, ProcessInstance, currentProcess, currentFlowObject, token, message, recoveryPayload) {
  /* Clone the currentFlowObject as we update the timeDuration and other settings for execution */
  currentFlowObject = JSON.parse(JSON.stringify(currentFlowObject));

  if (currentFlowObject.timeDate) {
    if (recoveryPayload && recoveryPayload.applicableTo(currentFlowObject)) {
      currentFlowObject.timeDuration = -1;
      currentFlowObject.keepActive = recoveryPayload.keepActive;
      // follow normal execution
      currentProcess._registerTimerEvents(options, currentFlowObject);
    } else {
      currentFlowObject.timeDate = sandbox.evaluate$Expression(options, currentFlowObject.timeDate, message, currentProcess);
      let schedule = timeoutCalculator.getSchedule(currentFlowObject.timeDate, new Date());

      // create timer instance and associate with process instance execution id
      ProcessInstance.app.models.DurableTimeout.create({
        nextExecution: schedule.items[0],
        schedule: schedule.items,
        perpetual: schedule.perpetual,
        definition: schedule.definition,
        tokenId: token.id,
        processInstanceId: currentProcess.id
      }, options, function persistTimer(err, timer) {
        /* istanbul ignore if*/
        if (err) {
          return log.error(options, err);
        }
        log.debug(options, 'timer registered');
      });
    }
  } else {
    if (currentFlowObject.timeDuration) {
      let timeDuration = currentFlowObject.timeDuration;
      let evaluatedtimeDuration = sandbox.evaluate$Expression(options, timeDuration, message, currentProcess);
      if (evaluatedtimeDuration[0] === 'P') {
        /* ISO8601 Duration value PnYnMnDTnHnMnS */
        currentFlowObject.timeDuration = timeoutCalculator.getSeconds(evaluatedtimeDuration) * 1000;
      } else {
        currentFlowObject.timeDuration = Number(evaluatedtimeDuration);
      }
      if (recoveryPayload && recoveryPayload.applicableTo(currentFlowObject)) {
        currentFlowObject.timeDuration -= recoveryPayload._diff;
      }
    }

    // register timer event and just wait
    currentProcess._registerTimerEvents(options, currentFlowObject);
  }
}

exports._tokenArrivedEventHandler = function _tokenArrivedEventHandler(options, ProcessInstance, currentProcess, token, pDelta, recoveryPayload) {
  var delta;
  var payload;
  if (pDelta) {
    delta = pDelta;
  } else {
    delta = new StateDelta();
  }

  currentProcess.processDefinition({}, options, function fetchPD(err, processDefinitionInstance) {
    /* istanbul ignore if*/
    if (err) {
      return log.error(options, err);
    }
    var processDefinition = processDefinitionInstance.processDefinition;
    var currentFlowObject = processDefinitionInstance.getFlowObjectByName(token.name);
    setImmediate(function setImmediateCb() {
      // Need to make this step async so that prev flow can complete
      flowObjectEvaluator.evaluate(options, currentFlowObject, token.message, currentProcess, delta, token, handlerDone);
    });

    function handlerDone(err, message) {
      /* istanbul ignore if*/
      if (err) {
        return log.error(options, err);
      }
      if (currentFlowObject.isReceiveTask) {
        // do nothing here
      } else if (currentFlowObject.isWaitTask) {
        var poolInfo = processDefinitionInstance.findPoolInfo(currentFlowObject);
        var taskObj = {
          name: currentFlowObject.name,
          processTokenId: token.id,
          message: message,
          correlationId: currentProcess.correlationId
        };

        var inputParameters;
        var evalInput;
        if (currentFlowObject.inputOutputParameters && currentFlowObject.inputOutputParameters.inputParameters) {
          inputParameters = currentFlowObject.inputOutputParameters.inputParameters;
          evalInput = recrevaluatePayload(inputParameters, token.message, currentProcess);
          taskObj.stepVariables = {};
          Object.assign(taskObj.stepVariables, evalInput);
        }
        if (taskObj.stepVariables && token.message && typeof token.message === 'object' && typeof taskObj.stepVariables === 'object') {
          Object.assign(token.message, taskObj.stepVariables);
        }
        var evalEntity = function evalEntity(entityList) {
          if (Array.isArray(entityList)) {
            try {
              entityList = entityList.reduce(function concat(n1, n2) {
                return n1 + ',' + n2;
              });
            } catch (ex) {
              log.error(new Error('Unable to dynamically evaluate ' + entityList + '. Please check expression in UserTask'));
              entityList = null;
            }
          }
          entityList = sandbox.evaluate$Expression(options, entityList, token.message, currentProcess, token.inVariables);
          if (entityList === '' || entityList === 'undefined') {
            return [];
          }
          return entityList.split(',').map(v => {
            return v.trim();
          });
        };

        if (currentFlowObject.candidateUsers) {
          let evaluatedList = evalEntity(currentFlowObject.candidateUsers);
          if (evaluatedList !== null) {
            taskObj.candidateUsers = evaluatedList;
          }
        }
        if (currentFlowObject.excludedUsers) {
          let evaluatedList = evalEntity(currentFlowObject.excludedUsers);
          if (evaluatedList !== null) {
            taskObj.excludedUsers = evaluatedList;
          }
        }
        if (currentFlowObject.candidateRoles) {
          let evaluatedList = evalEntity(currentFlowObject.candidateRoles);
          if (evaluatedList !== null) {
            taskObj.candidateRoles = evaluatedList;
          }
        }
        if (currentFlowObject.excludedRoles) {
          let evaluatedList = evalEntity(currentFlowObject.excludedRoles);
          if (evaluatedList !== null) {
            taskObj.excludedRoles = evaluatedList;
          }
        }
        if (currentFlowObject.candidateGroups) {
          let evaluatedList = evalEntity(currentFlowObject.candidateGroups);
          if (evaluatedList !== null) {
            taskObj.candidateGroups = evaluatedList;
          }
        }
        if (currentFlowObject.excludedGroups) {
          let evaluatedList = evalEntity(currentFlowObject.excludedGroups);
          if (evaluatedList !== null) {
            taskObj.excludedGroups = evaluatedList;
          }
        }
        // additionaly add to the included pool info
        if (poolInfo) {
          let poolCandidateType = 'User';
          let poolCandidates;
          if (poolInfo.indexOf(':') > 0) {
            let splits = poolInfo.split(':');
            poolCandidateType = splits[0];
            poolCandidates = evalEntity(splits[1]) || [];
          } else {
            poolCandidates = evalEntity(poolInfo) || [];
          }

          if (poolCandidateType === 'Role') {
            if (Array.isArray(taskObj.candidateRoles)) {
              taskObj.candidateRoles = taskObj.candidateRoles.concat(poolCandidates);
            } else {
              taskObj.candidateRoles = poolCandidates;
            }
          } else if (poolCandidateType === 'User') {
            if (Array.isArray(taskObj.candidateUsers)) {
              taskObj.candidateUsers = taskObj.candidateUsers.concat(poolCandidates);
            } else {
              taskObj.candidateUsers = poolCandidates;
            }
          } else if (poolCandidateType === 'Group') {
            if (Array.isArray(taskObj.candidateGroups)) {
              taskObj.candidateGroups = taskObj.candidateGroups.concat(poolCandidates);
            } else {
              taskObj.candidateGroups = poolCandidates;
            }
          }
        }
        if (currentProcess._poolInfo) {
          taskObj.candidateUsers.concat(evalEntity(currentProcess._poolInfo));
        }

        // additional form changes
        if (currentFlowObject.formType) {
          taskObj.formType = currentFlowObject.formType;
          if (currentFlowObject.formKey) {
            taskObj.formKey = sandbox.evaluate$Expression(options, currentFlowObject.formKey, token.message, currentProcess, token);
          }
        }

        var evaluatePayload = function evaluatePayload(options, inputData, message, process) {
          // evaluating payload
          try {
            var payload = sandbox.evaluateDirect(options, '`' + inputData + '`', message, process);
          } catch (err) {
            return log.error(options, err);
          }
          return payload;
        };

        var variables = {};
        var variableObj;

        if (currentFlowObject.formType === 'FormData') {
          variableObj = {};

          for (var key in currentFlowObject.formVariables) {
            if (Object.prototype.hasOwnProperty.call(currentFlowObject.formVariables, key)) {
              var formField = currentFlowObject.formVariables[key];
              // TODO : evaluate the value while generating task form data
              var value = formField.defaultValue;
              log.debug(options, value);
              formField.defaultValue = evaluatePayload(options, formField.defaultValue, token.message, currentProcess);
              variableObj[key] = formField;
            }
          }

          taskObj.formType = currentFlowObject.formType;
          Object.assign(variables, variableObj);
        } else if (currentFlowObject.hasFormVariables) {
          // provide Task Instance with specified variables
          variableObj = {};
          for (var i in currentFlowObject.formVariables) {
            if (Object.prototype.hasOwnProperty.call(currentFlowObject.formVariables, i)) {
              var variableName = currentFlowObject.formVariables[i];
              variableObj[variableName] = currentProcess._processVariables[variableName];
            }
          }
          Object.assign(variables, variableObj);
        } else {
          // give a copy of all Process Variables - possible risk
          Object.assign(variables, currentProcess._processVariables, token.inVariables || {});
        }
        taskObj.formVariables = variables;
        taskObj.processInstanceId = currentProcess.id;
        taskObj.workflowInstanceId = currentProcess.workflowInstanceId;
        var dateFormat = 'DD-MM-YYYY';

        if (currentFlowObject.followUpDate) {
          let evaluatedList = evalEntity([currentFlowObject.followUpDate]);
          if (evaluatedList && evaluatedList.length > 0) {
            taskObj.followUpDate = dateUtils.parseShorthand(evaluatedList[0], dateFormat);
          }
        }
        if (currentFlowObject.dueDate) {
          let evaluatedList = evalEntity([currentFlowObject.dueDate]);
          if (evaluatedList && evaluatedList.length > 0) {
            taskObj.dueDate = dateUtils.parseShorthand(evaluatedList[0], dateFormat);
          }
        }
        if (currentFlowObject.priority) {
          let evaluatedList = evalEntity([currentFlowObject.priority]);
          if (evaluatedList && evaluatedList.length > 0) {
            taskObj.priority = evaluatedList[0];
          }
        }

        let preCreateFunction = function preCreateFunction(options, taskDef, taskData, cb) {
          /* default do-nothing */
          return cb(null, taskData);
        };

        let workflowAddons = ProcessInstance.app.workflowAddons || {};
        if (currentFlowObject.creationHook) {
          if (workflowAddons[currentFlowObject.creationHook]) {
            preCreateFunction = workflowAddons[currentFlowObject.creationHook];
          } else {
            log.error('Pre Complete function ' + currentFlowObject.creationHook + ' not defined');
          }
        } else if (workflowAddons.defaultTaskCreationHook) {
          preCreateFunction = workflowAddons.defaultTaskCreationHook;
        }

        /* Invoke with process-instance as 'this' */
        preCreateFunction.call(currentProcess, options, currentFlowObject, taskObj, function preCreateCallback(err, modifiedTaskObj) {
          /* istanbul ignore if*/
          if (err) {
            log.error(options, err);
          }
          ProcessInstance.app.models.Task.create(modifiedTaskObj, options, function createTask(err, task) {
            /* istanbul ignore if*/
            if (err) {
              return log.error(options, err);
            }
            // console.log('Emitting Task Event ', currentProcess.processDefinitionName + '-' + task.name);
            ProcessInstance.app.models.Task.emit(currentProcess.processDefinitionName + '-' + task.name, task, currentProcess);
          });
        });
      } else if (currentFlowObject.isSubProcess || currentFlowObject.isCallActivity) {
        var processVariablesToPass = {};
        Object.assign(processVariablesToPass, currentProcess._parentProcessVariables || {});
        Object.assign(processVariablesToPass, currentProcess._processVariables);

        var parentToken = _.cloneDeep(token);
        delete parentToken.status;
        var subProcessesIns = {
          'processDefinitionName': currentFlowObject.subProcessId,
          'parentToken': parentToken,
          '_parentProcessVariables': processVariablesToPass,
          'workflowInstanceId': currentProcess.workflowInstanceId,
          'processVariables': {
            '_modelInstance': {}
          }
        };

        if (currentProcess._processVariables._modelInstance) {
          Object.assign(subProcessesIns.processVariables._modelInstance, currentProcess._processVariables._modelInstance);
        }
        // additionally pass any local variables as process variables -> step variables/ multi instance variables
        if (token.inVariables) {
          Object.assign(subProcessesIns.processVariables, token.inVariables);
        }

        // Map the required process variables to call activity
        if (currentFlowObject.isCallActivity) {
          if (currentFlowObject.inOutMappings && currentFlowObject.inOutMappings.inputMappings) {
            var inputMappings = currentFlowObject.inOutMappings.inputMappings;
            for (var source in inputMappings) {
              if (Object.prototype.hasOwnProperty.call(inputMappings, source) && source === 'variables' && inputMappings[source] === 'all') {
                Object.assign(subProcessesIns.processVariables, currentProcess._processVariables);
              } else if (token.inVariables && source in token.inVariables) {
                // use multi-instance variables first
                let target = inputMappings[source];
                subProcessesIns.processVariables[target] = token.inVariables[source];
              } else if (source in currentProcess._processVariables) {
                let target = inputMappings[source];
                source = sandbox.evaluate$Expression(options, source, message, currentProcess);
                if (typeof currentProcess._processVariables[source] === 'object') {
                  subProcessesIns.processVariables[target] = {};
                  Object.assign(subProcessesIns.processVariables[target], currentProcess._processVariables[source]);
                } else {
                  subProcessesIns.processVariables[target] = currentProcess._processVariables[source];
                }
              }
            }
          } else {
            Object.assign(subProcessesIns.processVariables, currentProcess._processVariables);
          }
        }
        if (currentFlowObject.inputOutputParameters && currentFlowObject.inputOutputParameters.inputParameters) {
          inputParameters = currentFlowObject.inputOutputParameters.inputParameters;
          evalInput = recrevaluatePayload(inputParameters, token.message, currentProcess);
          Object.assign(subProcessesIns.processVariables, evalInput);
        } else if (currentFlowObject.isSubProcess) {
          Object.assign(subProcessesIns.processVariables, currentProcess._processVariables);
        }

        var evaluatedProcessName = currentFlowObject.subProcessId;
        if (currentFlowObject.isCallActivity) {
          evaluatedProcessName = sandbox.evaluate$Expression(options, currentFlowObject.subProcessId, message, currentProcess);
        }

        var filter = {
          'and': [{
            'name': evaluatedProcessName
          }, {
            'latest': true
          }]
        };
        if (currentFlowObject.isSubProcess) {
          var SubProcessName = evaluatedProcessName.split('$')[0];
          filter = {
            'and': [{
              'name': SubProcessName
            }, {
              'latest': true
            }]
          };
        }
        ProcessInstance.app.models.WorkflowDefinition.find({
          'where': filter
        }, options,
        function fetchCallActivityWD(err, workflowDefinition) {
          /* istanbul ignore if*/
          if (err) {
            return log.error(options, 'call activity or Subprocess definition fetch error', err);
          }
          if (!workflowDefinition || workflowDefinition.length === 0) {
            return log.error(options, 'Call Activity definition not found');
          }
          var pdfilter = {
            'and': [{
              'name': evaluatedProcessName
            }, {
              'workflowDefinitionId': workflowDefinition[0].id
            }]
          };
          ProcessInstance.app.models.ProcessDefinition.find({
            'where': pdfilter
          }, options, function fetchCallActivityPD(err, pDefinition) {
            /* istanbul ignore if*/
            if (err) {
              return log.error(options, err);
            }
            if (pDefinition.length !== 1) {
              return log.error(options, new Error('call activity process definition not found or found multiple'));
            }
            subProcessesIns.processDefinitionId = pDefinition[0].id;
            subProcessesIns.processDefinitionName = pDefinition[0].name;
            subProcessesIns.parentProcessInstanceId = currentProcess.id;
            subProcessesIns.workflowInstanceId = currentProcess.workflowInstanceId;
            var poolInfoSP = processDefinitionInstance.findPoolInfo(currentFlowObject);
            if (poolInfoSP) {
              subProcessesIns._poolInfo = poolInfoSP;
            }
            currentProcess.subProcesses.create(subProcessesIns, options, function createSubProcess(err) {
              /* istanbul ignore if*/
              if (err) {
                return log.error(options, err);
              }
            });
          });
        });
      } else if (currentFlowObject.isEndEvent || currentFlowObject.isIntermediateThrowEvent) {
        let code;
        payload = null;
        if (currentFlowObject.isMessageEvent) {
          payload = throwObject.throwObject('message', currentFlowObject.messageName, message);
        } else if (currentFlowObject.isSignalEvent) {
          var evaluatedSignalName = sandbox.evaluate$Expression(options, currentFlowObject.signalName, message, currentProcess);
          if (evaluatedSignalName === null) {
            err = new Error('Unable to evaluate signal name via Sandbox');
            return log.error(options, err);
          }
          payload = throwObject.throwObject('signal', evaluatedSignalName);
        } else if (currentFlowObject.isEscalationEvent) {
          for (key in processDefinition.eventObjectMap) {
            if (Object.prototype.hasOwnProperty.call(processDefinition.eventObjectMap, key)) {
              if (processDefinition.eventObjectMap[key] === currentFlowObject.escalationId) {
                code = key;
              }
            }
          }
          payload = throwObject.throwObject('escalation', currentFlowObject.escalationId, code);
        } else if (currentFlowObject.isErrorEvent) {
          for (key in processDefinition.eventObjectMap) {
            if (Object.prototype.hasOwnProperty.call(processDefinition.eventObjectMap, key)) {
              if (processDefinition.eventObjectMap[key] === currentFlowObject.errorId) {
                code = key;
              }
            }
          }
          payload = throwObject.throwObject('error', currentFlowObject.errorId, code);
        }
        if (payload) {
          if (payload.type === 'signal') {
            ProcessInstance.app.models.WorkflowSignal.broadcast(payload.id, options, function broadcastCb(err, signals) {
              if (err) {
                return log.error(options, err);
              }
              log.debug('[', signals.count, '] signals sent');
            });
          } else if (payload.type === 'escalation') {
            currentProcess.parentProcess(options, function fetchParentProcess(err, parentProcess) {
              /* istanbul ignore if*/
              if (err) {
                return log.error(options, err);
              }
              ProcessInstance.emit(INTERMEDIATE_CATCH_EVENT, options, ProcessInstance, parentProcess, payload);
            });
          } else if (processDefinition.messageFlowBySourceIndex[currentFlowObject.bpmnId]) {
            var msgFlows = processDefinition.messageFlowBySourceIndex[currentFlowObject.bpmnId];
            var externalMessageFlows = msgFlows.filter(item => item.isExternal);
            if (externalMessageFlows.length > 0) {
              currentProcess.workflowInstance({}, options, function cb(err, wfInstance) {
                /* istanbul ignore if*/
                if (err) {
                  return log.error(options, err);
                }
                if (!wfInstance) {
                  return log.error('externalMessageHandling: Workflow-Definition not found');
                }
                var processDefinitionIds = new Set(externalMessageFlows.map(item => item.targetProcessDefinitionId));

                processDefinitionIds.forEach(function IterateOverIds(procDefId) {
                  wfInstance.passThrownMessage(procDefId, options, message, payload);
                });
              });
            }
          } else {
            ProcessInstance.emit(INTERMEDIATE_CATCH_EVENT, options, ProcessInstance, currentProcess, payload);
          }
        }
        if (currentFlowObject.isEndEvent) {
          if (currentFlowObject.isTerminateEvent) {
            delta.setIsForceEndToken();
            ProcessInstance.emit(TERMINATE_INTERRUPT_EVENT, options, ProcessInstance, currentProcess);
          } else {
            delta.setIsEndToken();
          }
        }
        currentProcess._endFlowObject(options, token, processDefinitionInstance, delta, message);
        /*      } else if (currentFlowObject.isDisabled && currentFlowObject.isBoundaryEvent && currentFlowObject.isTimerEvent) {
        if (currentFlowObject.isTimerEvent) {
          return;
        }
        var eventOnFlowObjectID = currentFlowObject.attachedToRef;
        var activity = processDefinitionInstance.getProcessElement(eventOnFlowObjectID);
        if (currentFlowObject.cancelActivity !== 'false') {
          // It is an interrupting event.
          currentProcess._clearBoundaryTimerEvents(delta, options, activity);
          currentProcess._terminateSubProcesses(options, activity);
          var attachedToRefToken = currentProcess.findToken(activity);
          delta.setTokenToTerminate(attachedToRefToken.id);
          log.debug(options, 'Setting delta with tokens to Remove [' + attachedToRefToken.name + ']');

          // if attached activity is a user task, interrupt the user task
          if (activity.isUserTask) {
            var Task = ProcessInstance.app.models.Task;

            Task.find({
              where: {
                processTokenId: attachedToRefToken.id
              }
            }, options, function fetchTask(err, tasks) {
              if (err) {
                log.error(options, err);
              } else if (tasks.length !== 1) {
                var taskErr = new Error('Task not found to interrupt during Boundary event interruption');
                log.error(options, taskErr);
              } else {
                // filtered on processTokenId which is unique so at most num of tasks returned will be 1
                var task = tasks[0];
                Task.emit('TASK_INTERRUPT_EVENT', options, Task, task);
                log.debug(options, 'Signal sent to Task with id ' + task.id + ' to interrupt.');
              }
            });
          }
        }

        log.debug(options, 'Leaving from isBoundaryEvent with token [' + token.name + '] ');
        currentProcess._endFlowObject(options, token, processDefinitionInstance, delta, message);
      */
      } else if (currentFlowObject.isIntermediateCatchEvent || currentFlowObject.isBoundaryEvent) {
        if (currentFlowObject.isSignalEvent) {
          // for any kind of signal event be it, start, boundary, intermediate, we create a workflow signal and wait
          evaluatedSignalName = sandbox.evaluate$Expression(options, currentFlowObject.signalName, message, currentProcess);

          if (evaluatedSignalName === null) {
            err = new Error('Unable to evaluate signal name via Sandbox');
            return log.error(options, err);
          }

          // create signal instance and associate with process instance execution id
          ProcessInstance.app.models.WorkflowSignal.create({
            signalRef: evaluatedSignalName,
            tokenId: token.id,
            processInstanceId: currentProcess.id,
            workflowInstanceId: currentProcess.workflowInstanceId
          }, options, function persistSignal(err, signal) {
            /* istanbul ignore if*/
            if (err) {
              return log.error(options, err);
            }
            log.debug(options, 'signal registered');
          });
        } else if (currentFlowObject.isTimerEvent) {
          _executeTimerEvent(options, ProcessInstance, currentProcess, currentFlowObject, token, message, recoveryPayload);
        } else if (currentFlowObject.isConditionalEvent) {
          let isSatisfied = JSON.parse(sandbox.evaluate$Expression(options, currentFlowObject.expression, message, currentProcess));
          if (isSatisfied) {
            payload = throwObject.throwObject('condition', currentFlowObject.name);
            ProcessInstance.emit(INTERMEDIATE_CATCH_EVENT, options, ProcessInstance, currentProcess, payload);
          } else {
            // wait for process variables creations, updations to trigger again
          }
        } else {
          // do nothing, just wait, for escalation, message, conditional, error, compensation
        }
      } else if (currentFlowObject.isStartEvent) {
        // this part will hold all kinds of implementations for Start Event
        if (currentFlowObject.isSignalEvent) {
          evaluatedSignalName = sandbox.evaluate$Expression(options, currentFlowObject.signalName, message, currentProcess);

          if (evaluatedSignalName === null) {
            err = new Error('Unable to evaluate signal name via Sandbox');
            return log.error(options, err);
          }

          // create signal instance and associate with process instance execution id
          ProcessInstance.app.models.WorkflowSignal.create({
            'signalRef': evaluatedSignalName,
            'tokenId': token.id,
            'processInstanceId': currentProcess.id,
            'workflowInstanceId': currentProcess.workflowInstanceId
          }, options, function persistSignal(err, signal) {
            /* istanbul ignore if*/
            if (err) {
              return log.error(options, err);
            }
            log.debug(options, 'signal registered');
          });
        } else if (currentFlowObject.isTimerEvent) {
          _executeTimerEvent(options, ProcessInstance, currentProcess, currentFlowObject, token, message, recoveryPayload);
        } else if (currentFlowObject.isMessageEvent) {
          // do nothing, just wait, for escalation, message, conditional, error, compensation
        } else {
          currentProcess._endFlowObject(options, token, processDefinitionInstance, delta, message);
        }
      } else if (currentFlowObject.isParallelGateway || currentFlowObject.isInclusiveGateway) {
        /** We populate _synchronizeFlow with all possible active incoming paths (see process-state-delta.js)
         * Paths that have NOT completed (and are expected to complete) will remain NULL
         * For parallel-gateway all paths are expected to complete.
         * For inclusive-gateway, only active paths are expected to complete.
         * If we do not have any NULL value for all keys in _synchronizeFlow (for this node),
         * then we can 'end this flow object'.
        */
        var gwId = token.bpmnId;
        var emittable = Object.keys(currentProcess._synchronizeFlow[gwId]).map(function checkDefined(flow) {
          return currentProcess._synchronizeFlow[gwId][flow] !== null;
        }).reduce(function checkAllTrue(f1, f2) {
          return f1 && f2;
        });
        if (emittable) {
          /**
           * All incoming branches have completed and we can resume
           * If only one branch is incoming,
           *     we pass the message as it is
           * If more than one branch is converging then
           *     we create a map of messages
           *     where keys are name of message emitting node in each branch
           */
          if (currentProcess._synchronizeFlow[gwId] && Object.keys(currentProcess._synchronizeFlow[gwId]).length > 1) {
            /* More than one branch converging, create a merged message for passing to next node */
            message = Object.values(currentProcess._synchronizeFlow[gwId]).map(function extractMessages(gwayTokenId) {
              let gwayToken = currentProcess._processTokens[gwayTokenId];
              return {
                name: gwayToken.meta.from,
                value: gwayToken.message
              };
            }).reduce(function mergeMessages(map, obj) {
              if (typeof (obj.value) !== 'undefined') {
                map[obj.name] = obj.value;
              }
              return map;
            }, {});
          }

          currentProcess._endFlowObject(options, token, processDefinitionInstance, delta, message);
        }
      } else {
        currentProcess._endFlowObject(options, token, processDefinitionInstance, delta, message);
      }
    }
  });
};
