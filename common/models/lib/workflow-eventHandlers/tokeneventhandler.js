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
var throwObject = require('../throwobject.js');
var StateDelta = require('../../process-state-delta.js');
var flowObjectEvaluator = require('../workflow-nodes/evaluate-flow-object.js');
var dateUtils = require('../utils/date-utils.js');
var sandbox = require('../workflow-nodes/sandbox.js');
var RecrevaluatePayload = require('../workflow-nodes/businessruletask-node.js').evaluatePayload;
var _ = require('lodash');

var INTERMEDIATE_CATCH_EVENT = 'INTERMEDIATE_CATCH_EVENT';
var TERMINATE_INTERRUPT_EVENT = 'TERMINATE_INTERRUPT_EVENT';

var exports = module.exports = {};

exports._tokenArrivedEventHandler = function _tokenArrivedEventHandler(options, ProcessInstance, currentProcess, token, pDelta, recoveryPayload) {
  var delta;
  var payload;
  var code;
  var prop;

  if (pDelta) {
    delta = pDelta;
  } else {
    delta = new StateDelta();
  }

  currentProcess.processDefinition({}, options, function fetchPD(err, processDefinitionInstance) {
    if (err) {
      log.error(options, err);
      return;
    }
    var processDefinition = processDefinitionInstance.processDefinition;
    var currentFlowObject = processDefinitionInstance.getFlowObjectByName(token.name);
    setImmediate(function setImmediateCb() {
      // Need to make this step async so that prev flow can complete
      flowObjectEvaluator.evaluate(options, currentFlowObject, token.message, currentProcess, delta, token, handlerDone);
    });

    function handlerDone(err, message) {
      if (err) {
        log.error(options, err);
        return;
      }
      if (currentFlowObject.isReceiveTask) {
        // do nothing here
      } else if (currentFlowObject.isWaitTask) {
        var poolInfo = processDefinitionInstance.findPoolInfo(currentFlowObject);
        var taskObj = {
          'name': currentFlowObject.name,
          'processTokenId': token.id
        };


        if (currentFlowObject.inputOutputParameters && currentFlowObject.inputOutputParameters.inputParameters){
          var inputParameters = currentFlowObject.inputOutputParameters.inputParameters;
          var evalInput = RecrevaluatePayload(inputParameters, token.message, currentProcess);
          Object.assign(taskObj.stepVariables, evalInput);
        }

        Object.assign(token.message, taskObj.stepVariables);
        var evalEntity = function evalEntity(entityList) {
          entityList = updateExpBackComp(entityList);
          entityList = sandbox.evaluate$Expression(options, entityList, token.message, currentProcess, token);
          return entityList.split(',');
        };

        var updateExpBackComp = function updateExp(expList) {
          try {
            var updatedExp = expList.map(function updateName(name) {
              return name.charAt(0) === '$' && name.charAt(1) !== '{'  ? name.slice(0, 1) + '{' + name.slice(1) + '}' : name;
            }).reduce(function addComma(n1, n2) {
              return n1 + ',' + n2;
            });
            if (updatedExp !== expList.reduce(function concat(x, y) {return x + ',' + y;})) {
              var depMessage = '[TO BE DEPRECATED SOON]: Please update UserTask expression from $username to ${username} && $_msg.username to ${msg.username}.\nArrays are also supported now for dynamic evaluation.';
              // eslint-disable-next-line
              console.log(depMessage);
              log.error(options, new Error(depMessage));
            }
            return updatedExp;
          } catch (ex) {
            log.error(new Error('Unable to dynamically evaluate Users/Roles, please check expression in UserTask'));
            return null;
          }
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
        var userInfo;
        // additionaly add to the includede pool info
        if (poolInfo) {
          if (poolInfo.startsWith('Role:')) {
            userInfo = poolInfo.split(':');
            if (typeof taskObj.candidateRoles  === 'object' && taskObj.candidateRoles.constructor.name  === 'Array') {
              taskObj.candidateRoles.push(userInfo[1]);
            } else {
              taskObj.candidateRoles = [userInfo[1]];
            }
          } else if (poolInfo.startsWith('User:')) {
            userInfo = poolInfo.split(':');
            if (typeof taskObj.candidateRoles  === 'object' && taskObj.candidateRoles.constructor.name  === 'Array') {
              taskObj.candidateUsers.push(userInfo[1]);
            } else {
              taskObj.candidateUsers = [userInfo[1]];
            }
          } else if (poolInfo.startsWith('Group')) {
            userInfo = poolInfo.split(':');
            if (typeof taskObj.candidateRoles  === 'object' && taskObj.candidateRoles.constructor.name  === 'Array') {
              taskObj.candidateGroups.push(userInfo[1]);
            } else {
              taskObj.candidateGroups = [userInfo[1]];
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
            taskObj.formKey = currentFlowObject.formKey;
          }
        }

        var evaluatePayload = function evaluatePayload(options, inputData, message, process) {
          var self = this;

          for (prop in process._processVariables) {
            if (Object.prototype.hasOwnProperty.call(process._processVariables, prop)) {
              self[prop] = process._processVariables[prop];
            }
          }

          for (prop in message) {
            if (Object.prototype.hasOwnProperty.call(message, prop)) {
              self[prop] = message[prop];
            }
          }

          var payload = '';
          var propVal;

          var propExp = 'propVal = `' + inputData + '`';
          // TODO : replace eval with sandbox
          // eslint-disable-next-line
          eval(propExp);
          payload = propVal;

          for (prop in process._processVariables) {
            if (Object.prototype.hasOwnProperty.call(process._processVariables, prop)) {
              delete self[prop];
            }
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
          Object.assign(variables, currentProcess._processVariables);
        }
        taskObj.formVariables = variables;
        taskObj.processInstanceId = currentProcess.id;
        taskObj.workflowInstanceId = currentProcess.workflowInstanceId;
        var ioparams = currentFlowObject.inputOutputParameters;
        var dateFormat = 'DD-MM-YYYY';
        // if (ioparams && ioparams.inputParameters && ioparams.inputParameters.__dateFormat__) {
          // dateFormat = ioparams.inputParameters.__dateFormat__;
        // }

        if (currentFlowObject.followUpDate) {
          let evaluatedList = evalEntity([currentFlowObject.followUpDate]);
          if (evaluatedList !== null) {
            taskObj.followUpDate = dateUtils.parse_date(evaluatedList[0], dateFormat);
          }
        }
        if (currentFlowObject.dueDate) {
          let evaluatedList = evalEntity([currentFlowObject.dueDate]);
          if (evaluatedList !== null) {
             taskObj.dueDate = dateUtils.parse_date(evaluatedList[0], dateFormat);
          }
        }
        if (currentFlowObject.priority) {
          let evaluatedList = evalEntity([currentFlowObject.priority]);
          if (evaluatedList !== null) {
             taskObj.priority = evaluatedList[0];
          }
        }
        ProcessInstance.app.models.Task.create(taskObj, options, function createTask(err, task) {
          if (err) {
            log.error(options, err);
            return;
          }
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
            '_modelInstance' : {}
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
          if (currentFlowObject.inOutMappings && currentFlowObject.inputMappings) {
            var inputMappings = currentFlowObject.inOutMappings.inputMappings;
            for (var source in inputMappings) {
              if (source === 'variables' && inputMappings[source] === 'all') {
                Object.assign(subProcessesIns.processVariables, currentProcess._processVariables)
              } else if(source in currentProcess._processVariables) {
                source = sandbox.evaluate$Expression(options, source, message, currentProcess);
                var target = inputMappings[source];
                if (typeof currentProcess._processVariables[source] === 'object') {
                  subProcessesIns.processVariables[target] = {};
                  Object.assign(subProcessesIns.processVariables[target], currentProcess._processVariables[source]);
                } else {
                  subProcessIns.processVariables[target] = currentProcess._processVariables[source];
                }
              }
            }
          }
        }
        if (currentFlowObject.inputOutputParameters && currentFlowObject.inputOutputParameters.inputParameters){
          var inputParameters = currentFlowObject.inputOutputParameters.inputParameters;
          var evalInput = RecrevaluatePayload(inputParameters, token.message, currentProcess);
          Object.assign(subProcessesIns.processVariables, evalInput);
        }

        var evaluatedProcessName = currentFlowObject.subProcessId;
        if (currentFlowObject.isCallActivity) {
          evaluatedProcessName = sandbox.evaluate$Expression(options, currentFlowObject.subProcessId, message, currentProcess);
        }

        var filter = {'and': [{'name': evaluatedProcessName}, {'latest': true}]};
        if (currentFlowObject.isSubProcess) {
          var SubProcessName = evaluatedProcessName.split('$')[0];
          filter = {'and': [{'name': SubProcessName}, {'latest': true}]};
        }
        ProcessInstance.app.models.WorkflowDefinition.find({'where': filter}, options,
          function fetchCallActivityWD(err, workflowDefinition) {
            var pdfilter = {'and': [{'name': evaluatedProcessName}, {'workflowDefinitionId': workflowDefinition[0].id}]};
            ProcessInstance.app.models.ProcessDefinition.find({'where': pdfilter
            }, options, function fetchCallActivityPD(err, pDefinition) {
              if (err) {
                log.error(options, err);
                return;
              }
              if (pDefinition.length !== 1) {
                var errx = new Error('call activity process definition not found or found multiple');
                log.error(options, errx);
                return;
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
                if (err) {
                  log.error(options, err);
                  return;
                }
              });
            });
          });
      } else if (currentFlowObject.isEndEvent || currentFlowObject.isIntermediateThrowEvent) {
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
            if (processDefinition.eventObjectMap[key] === currentFlowObject.escalationId) {
              code = key;
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
              if (err) {
                return log.error(options, err);
              }
              ProcessInstance.emit(INTERMEDIATE_CATCH_EVENT, options, ProcessInstance, parentProcess, payload);
            });
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
      } else if (currentFlowObject.isDisabled && currentFlowObject.isBoundaryEvent && currentFlowObject.isTimerEvent) {
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
            // to avoid the filter
            options._skip_tf = true;

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
            'signalRef': evaluatedSignalName,
            'tokenId': token.id,
            'processInstanceId': currentProcess.id,
            'workflowInstanceId': currentProcess.workflowInstanceId
          }, options, function persistSignal(err, signal) {
            if (err) {
              return log.error(options, err);
            }
            log.debug(options, 'signal registered');
          });
        } else if (currentFlowObject.isTimerEvent) {
          if (recoveryPayload && recoveryPayload.applicableTo(currentFlowObject)) {
            currentFlowObject.timeDuration -= recoveryPayload._diff;
          }
          // register timer event and just wait
          if (currentFlowObject.isIntermediateCatchEvent) {
            currentProcess._registerTimerEvents(options, 'INTERMEDIATE', currentFlowObject);
          } else if ( currentFlowObject.isBoundaryEvent) {
            currentProcess._registerTimerEvents(options, 'BOUNDARY', currentFlowObject);
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
            if (err) {
              return log.error(options, err);
            }
            log.debug(options, 'signal registered');
          });
        } else if (currentFlowObject.isTimerEvent) {
          currentProcess._registerTimerEvents(options, 'START', currentFlowObject);
        } else {
          currentProcess._endFlowObject(options, token, processDefinitionInstance, delta, message);
        }
      } else if (currentFlowObject.isParallelGateway) {
        var gwId = token.bpmnId;
        var emittable = Object.keys(currentProcess._synchronizeFlow[gwId]).map(function checkDefined(flow) {
          return currentProcess._synchronizeFlow[gwId][flow] !== null;
        }).reduce(function checkAllTrue(f1, f2) {
          return f1 && f2;
        });
        if (emittable) {
          currentProcess._endFlowObject(options, token, processDefinitionInstance, delta, message);
        }
      } else {
        currentProcess._endFlowObject(options, token, processDefinitionInstance, delta, message);
      }
    }
  });
};
