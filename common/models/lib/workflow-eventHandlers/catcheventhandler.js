/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
/**
 * @description Catch Event Handlers
 * @author Kangan Verma(kangan06), Mandeep Gill(mandeep6ill), Prem Sai(premsai-ch), Vivek Mittal(vivekmittal07)
 */

var logger = require('oe-logger');
var log = logger('CatchEventHandler');

var StateDelta = require('../../process-state-delta.js');

var INTERMEDIATE_CATCH_EVENT = 'INTERMEDIATE_CATCH_EVENT';

var exports = module.exports = {};
exports._intermediateCatchEventHandler = function _intermediateCatchEventHandler(options, ProcessInstance, currentProcess, throwObject, pDelta) {
  var delta = pDelta || new StateDelta();
  if (!throwObject) {
    return;
  }
  currentProcess.processDefinition({}, options, function fetchPD(err, processDefinitionInstance) {
    if (err) {
      log.error(options, err.message);
      return;
    }
    var processDefinition = processDefinitionInstance.processDefinition;
    if (!throwObject.id && !throwObject.code) {
      log.error(options, 'Invalide throw object');
      return;
    }
    var throwObjectId = throwObject.id;
    if (throwObject.type === 'escalation' || throwObject.type === 'error') {
      throwObjectId = processDefinition.eventObjectMap[throwObject.code];
    }
    var catchEventFlowObjects = processDefinition.catchEventIndex[throwObjectId] || [];

    if (throwObject.type === 'signal') {
      var token = currentProcess._processTokens[throwObject.attachedTokenId];
      catchEventFlowObjects.push(processDefinitionInstance.getProcessElement(token.bpmnId));
    }

    if (throwObject.type === 'escalation' || throwObject.type === 'error') {
      currentProcess.parentProcess(options, function fetchPI(err, parentProcess) {
        if (err) {
          log.error(options, err.message);
          return;
        }
        if (parentProcess) {
          ProcessInstance.emit(INTERMEDIATE_CATCH_EVENT, options, ProcessInstance, parentProcess, throwObject);
        } else {
          log.debug(options, 'No catch event for the escalation throw');
        }
      });
    }
    catchEventFlowObjects.forEach(function iterateCatchEventFO(catchEventFlowObject) {
      if (catchEventFlowObject.isIntermediateCatchEvent || catchEventFlowObject.isStartEvent) {
        if (currentProcess.isPending(catchEventFlowObject)) {
          var currentFlowObjectToken = currentProcess.findToken(catchEventFlowObject);
          if (catchEventFlowObject.isMessageEvent) {
            currentProcess._endFlowObject(options, currentFlowObjectToken, processDefinitionInstance, delta, throwObject.message);
          } else if (catchEventFlowObject.isTimerEvent) {
            currentProcess._endFlowObject(options, currentFlowObjectToken, processDefinitionInstance, delta);
          } else if (catchEventFlowObject.isSignalEvent) {
            currentProcess._endFlowObject(options, currentFlowObjectToken, processDefinitionInstance, delta);
          } else {
            log.error(options, 'Implementation not done for this kind of Catch Event [' + catchEventFlowObject.name + ']');
          }
        }
      } else if (catchEventFlowObject.isBoundaryEvent) {
        var currentFlowObject = catchEventFlowObject;
        var eventOnFlowObjectID = catchEventFlowObject.attachedToRef;
        var boundaryAttachedFlowObject = processDefinitionInstance.getProcessElement(eventOnFlowObjectID);
        if (currentProcess.isPending(boundaryAttachedFlowObject)) {
          var token = currentProcess.findToken(catchEventFlowObject);
          // ProcessInstance.emit(TOKEN_ARRIVED_EVENT, options, ProcessInstance, currentProcess, token, delta);

          var activity = processDefinitionInstance.getProcessElement(eventOnFlowObjectID);
          if (currentFlowObject.cancelActivity !== 'false') {
            // It is an interrupting event.
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

            // add boundary event tokens to interrupt for the currentFlowObject that we are completing, if any
            if (processDefinitionInstance.processDefinition.boundaryEventsByAttachmentIndex[activity.bpmnId]) {
              var boundaryEvents = processDefinitionInstance.processDefinition.boundaryEventsByAttachmentIndex[activity.bpmnId];
              for (var i = 0; i < boundaryEvents.length; i++) {
                var boundaryEvent = boundaryEvents[i];
                var boundaryEventToken = currentProcess.getTokenByFlowObject(boundaryEvent);
                if (boundaryEventToken && currentProcess.isPending(boundaryEventToken) && boundaryEvent.bpmnId !== currentFlowObject.bpmnId) {
                  delta.setTokenToInterrupt(boundaryEventToken.id);
                }
              }
            }
          }

          log.debug(options, 'Leaving from isBoundaryEvent with token [' + token.name + '] ');

          if (currentFlowObject.isTimerEvent) {
            currentProcess._endFlowObject(options, token, processDefinitionInstance, delta, {
              timerEvent: true
            });
          } else if (currentFlowObject.isSignalEvent) {
            currentProcess._endFlowObject(options, token, processDefinitionInstance, delta, {
              signalRef: throwObject.id
            });
          } else {
            currentProcess._endFlowObject(options, token, processDefinitionInstance, delta, {});
          }
        }
      } else {
        log.error(options, 'Catch Event Index is not properly built');
      }
    });
  });
};
