/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
/**
 * @description  Implementation of Process-Instance
 * @author Kangan Verma(kangan06), Mandeep Gill(mandeep6ill), Nirmal Satyendra(iambns), Prem Sai(premsai-ch), Vivek Mittal(vivekmittal07)
 */

var TOKEN_ARRIVED_EVENT = 'TOKEN_ARRIVED_EVENT';
var SUBPROCESS_END_EVENT = 'SUBPROCESS_END_EVENT';
var INTERMEDIATE_CATCH_EVENT = 'INTERMEDIATE_CATCH_EVENT';
var SUBPROCESS_INTERRUPT_EVENT = 'SUBPROCESS_INTERRUPT_EVENT';
var TERMINATE_INTERRUPT_EVENT = 'TERMINATE_INTERRUPT_EVENT';
var PROCESS_TERMINATE = 'PROCESS_TERMINATE';

var logger = require('oe-logger');
var log = logger('ProcessInstance');

var _ = require('lodash');

var timerEvents = require('../../lib/utils/timeouts.js');
var processTokens = require('../../lib/utils/process-tokens.js');
var StateDelta = require('../../lib/utils/process-state-delta.js');
var sandbox = require('../../lib/workflow-nodes/sandbox.js');
var recrevaluatePayload = require('../../lib/workflow-nodes/businessruletask-node.js').evaluatePayload;

var subprocessEventHandler = require('../../lib/workflow-eventHandlers/subprocesshandlers.js');
var catchEventHandler = require('../../lib/workflow-eventHandlers/catcheventhandler.js');
var tokenEventHandler = require('../../lib/workflow-eventHandlers/tokeneventhandler.js');

var TokenEmission = require('../../lib/utils/tokenemission.js');

/**
 * @param  {Object} ProcessInstance Process-Instance
 */
module.exports = function ProcessInstance(ProcessInstance) {
  ProcessInstance.on(TOKEN_ARRIVED_EVENT, tokenEventHandler._tokenArrivedEventHandler);
  ProcessInstance.on(SUBPROCESS_END_EVENT, subprocessEventHandler._subProcessEndEventHandler);
  ProcessInstance.on(INTERMEDIATE_CATCH_EVENT, catchEventHandler._intermediateCatchEventHandler);
  ProcessInstance.on(SUBPROCESS_INTERRUPT_EVENT, subprocessEventHandler._subProcessInterruptHandler);
  ProcessInstance.on(PROCESS_TERMINATE, subprocessEventHandler._subProcessInterruptHandler);
  ProcessInstance.on(TERMINATE_INTERRUPT_EVENT, subprocessEventHandler._terminateInterruptHandler);

  /**
   * Before Save Observer Hook
   */
  ProcessInstance.observe('before save', function beforeSavePI(ctx, next) {
    if (ctx.isNewInstance) {
      var instance = ctx.instance;
      instance.processDefinition({}, ctx.options, function fetchPD(err, processDefinitionInstance) {
        /* istanbul ignore if*/
        if (err) {
          log.error(ctx.options, err.message);
          return next(err);
        }
        // console.log('Process-Definition isntance is : ',JSON.stringify(processDefinitionInstance,null,'\t'),JSON.stringify(err,null,'\t'));
        if (!processDefinitionInstance) {
          return next(new Error('Process definition not present'));
        }
        var startFlowObjects = processDefinitionInstance.getStartEvents();

        if (!ctx.options) {
          var ctxerr = new Error('Workflow context init failed.');
          log.error(log.defaultContext(), ctxerr);
          return next(ctxerr);
        }
        var options = ctx.options;
        instance.init(options);

        startFlowObjects && startFlowObjects.forEach(startFlowObject => {
          let token = processTokens.createToken(startFlowObject.name, startFlowObject.bpmnId, instance.message);
          if (startFlowObject.isMessageEvent) {
            token.isMessageStartEvent = true;
          }
          instance._processTokens[token.id] = token;
        });
        instance.processDefinitionBpmnId = processDefinitionInstance.processDefinition.bpmnId;
        instance.unsetAttribute('message');
        instance.unsetAttribute('processVariables');
        next(err);
      });
    } else {
      next();
    }
  });

  /**
   * After Save Observer Hook
   */
  ProcessInstance.observe('after save', function afterSavePD(ctx, next) {
    if (ctx.isNewInstance) {
      var instance = ctx.instance;
      var options = instance._workflowCtx || ctx.options;

      var tokenIds = Object.keys(instance._processTokens);
      if (tokenIds && tokenIds.length > 0) {
        tokenIds.forEach(tokenId => {
          ProcessInstance.emit(TOKEN_ARRIVED_EVENT, options, ProcessInstance, instance, instance._processTokens[tokenId]);
        });
      } else {
        // no start event found
        var err = new Error('no start event found');
        log.error(ctx.options, err);
        return next(err);
      }
      next();
    } else {
      next();
    }
  });

  /**
   * Initialize the embedded properties
   * @param {Object} options Workflow Context
   * @returns {void}
   */
  ProcessInstance.prototype.init = function init(options) {
    this._processTokens = {};
    if (this.processVariables && typeof (this.processVariables) !== 'object') {
      var parseError = new Error('Process variables should be in Json format');
      log.error(options, parseError);
      return parseError;
    }

    this._processVariables = this.processVariables || {};
    this._status = 'running';
    this._processTimerEvents = {
      pendingTimeouts: {},
      endedTimeouts: {},
      timeoutIds: {},
      timerIds: {}
    };
    this._synchronizeFlow = {};

    // Check if this is really required.
    // Referring the invoking context instead of storing the context as part of workflow instance.
    // The property is still present but will remain undefined
    // this._workflowCtx = JSON.parse(JSON.stringify(options));
  };

  /**
   * Interaction point for RecieveMessage
   * @param  {Object}   options Options
   * @param  {String}   bpmnId  Bpmn Id
   * @param  {Object}   message Message
   * @param  {Function} next    Callback
   */
  ProcessInstance.prototype._recieveMessage = function _recieveMessage(options, bpmnId, message, next) {
    next = next || function empty() {};
    var self = this;
    this.processDefinition({}, options, function fetchPD(err, processDefinitionInstance) {
      /* istanbul ignore if*/
      if (err) {
        return next(err);
      }
      var taskObj = processDefinitionInstance.getProcessElement(bpmnId);
      if (taskObj === null) {
        return next(new Error('No corresponding taskName found.'));
      }
      var tokens = self._processTokens;
      var token = null;
      for (var i in tokens) {
        if (Object.prototype.hasOwnProperty.call(tokens, i) && tokens[i].name === taskObj.name) {
          token = tokens[i];
        }
      }

      if (token === null) {
        log.debug(options, 'Token not found');
        return next(new Error('No corresponding token found.'));
      } else if (token.status !== 'pending') {
        log.debug(options, 'Task already completed');
        return next(new Error('Task status is ' + token.status));
      }

      var delta = new StateDelta();
      // to disable boundary timer event if task is completed beforehand
      self._clearBoundaryTimerEvents(delta, options, processDefinitionInstance.getFlowObjectByName(token.name));
      // console.log('171 - _endFlowObject');
      self._endFlowObject(options, token, processDefinitionInstance, delta, message, next);
    });
  };

  ProcessInstance.prototype._receiveThrownMessage = function _receiveThrownMessage(options, message, payload, next) {
    next = next || function empty() { };
    var self = this;
    this.processDefinition({}, options, function fetchPD(err, processDefinitionInstance) {
      /* istanbul ignore if*/
      if (err) {
        return next(err);
      }
      var token = null;
      var delta = new StateDelta();
      var processDefinition = processDefinitionInstance.processDefinition;
      if (!payload.id && !payload.code) {
        log.error(options, 'Invalid throw object');
        return next(new Error('Invalid throw object'));
      }
      message = payload.message;
      var payloadId = payload.id;
      var messageStartEventFlowObjects = processDefinition.catchEventIndex[payloadId] || [];
      if (messageStartEventFlowObjects.length === 1) {
        var messageStartEventFlowObject = messageStartEventFlowObjects[0];
        if (messageStartEventFlowObject.isStartEvent && messageStartEventFlowObject.isMessageEvent) {
          if (self.isPending(messageStartEventFlowObject)) {
            token = self.findToken(messageStartEventFlowObject);
            self._endFlowObject(options, token, processDefinitionInstance, delta, message, next);
          }
        }
      } else if (messageStartEventFlowObjects.length > 1) {
        err = new Error('no two message start events should refer to the same message or should have same message name');
        log.error(options, err);
        return next(err);
      } else if (messageStartEventFlowObjects.length === 0) {
        err = new Error('no matching message found to start the process');
        log.error(options, err);
        return next(err);
      }
    });
  };

  /**
   * Handling Completion of User
   * @param  {Object}   options          Options
   * @param  {Object}   task             Task
   * @param  {Object}   message          Message
   * @param  {Object}   processVariables ProcessVariables
   * @param  {Object}   processDefinition Process Definition
   * @param  {Function} next             Callback
   * @returns {void}
   */
  ProcessInstance.prototype._completeTask = function _completeTask(options, task, message, processVariables, processDefinition, next) {
    var self = this;
    var token = this._processTokens[task.processTokenId];

    if (token === null) {
      log.debug(options, 'Token not found for the task');
      return next(new Error('Token not found for the task'));
    } else if (token.status !== 'pending') {
      log.debug(options, 'Task already completed');
      return next(new Error('Task already completed'));
    }
    var delta = new StateDelta();
    delta.setProcessVariables(processVariables);
    var currentFlowObject = processDefinition.getFlowObjectByName(token.name);
    if (currentFlowObject.inputOutputParameters && currentFlowObject.inputOutputParameters.outputParameters) {
      var outputParameters = currentFlowObject.inputOutputParameters.outputParameters;
      var evalOutput = recrevaluatePayload(outputParameters, task.message, self);
      var outputVariables = {};
      Object.assign(outputVariables, evalOutput);
    }
    if (outputVariables && task.message && typeof task.message === 'object' && typeof outputVariables === 'object') {
      Object.assign(task.message, outputVariables);
    }
    // to disable boundary timer event if task is completed beforehand
    self._clearBoundaryTimerEvents(delta, options, processDefinition.getFlowObjectByName(token.name));
    self._endFlowObject(options, token, processDefinition, delta, message, next);
  };

  /**
   * All actions to be performed while ending a flowobject has to be done here
   * Remove token from state, update end time , clear boundary timer events
   * Emit further tokens
   * @param  {Object}   options                   Options
   * @param  {Object}   flowObjectToken           Process-Token
   * @param  {Object}   processDefinitionInstance Process-Definition
   * @param  {Object}   delta                     Process-State-Delta
   * @param  {Object}   message                   Message
   * @param  {Function} next                      Callback
   * @returns {void}
   */
  ProcessInstance.prototype._endFlowObject = function _endFlowObject(options, flowObjectToken, processDefinitionInstance, delta, message, next) {
    next = next || function empty() {};

    var currentFlowObjectName = flowObjectToken.name;
    var currentFlowObject = processDefinitionInstance.getFlowObjectByName(currentFlowObjectName);
    var self = this;

    var nextFlowObjects = TokenEmission.getNextFlowObjects(currentFlowObject, message,
      processDefinitionInstance, self, options);
    if (message && message.error) {
      let failure = {};
      var props = Object.getOwnPropertyNames(message.error);
      for (let i = 0; i < props.length; i++) {
        failure[props[i]] = message.error[props[i]];
      }
      delta.setTokenToFail(flowObjectToken.id, failure);
    } else {
      for (var i in nextFlowObjects) {
        if (Object.prototype.hasOwnProperty.call(nextFlowObjects, i)) {
          var obj = nextFlowObjects[i];
          let meta;

          if (obj.isParallelGateway) {
            meta = {
              from: currentFlowObjectName,
              type: 'ParallelGateway',
              gwId: obj.bpmnId
            };
          } else if (obj.isInclusiveGateway) {
            meta = {
              from: currentFlowObjectName,
              type: 'InclusiveGateway',
              gwId: obj.bpmnId
            };
          } else if (obj.isAttachedToEventGateway) {
            meta = {
              type: 'EventGateway',
              tokensToInterrupt: obj.attachedFlowObjects
            };
          }

          var token = processTokens.createToken(obj.name, obj.bpmnId, message, meta);

          /* Mark token to be durable */
          if (obj.isTimerEvent && obj.timeDate) {
            token.isDurableTimeout = true;
          }

          if (obj.isUserTask) {
            token.isUserTask = true;
          }
          if (obj.isParallelGateway) {
            delta.setPGSeqsToExpect(obj.bpmnId, obj.expectedInFlows);
            delta.setPGSeqToFinish(obj.bpmnId, obj.attachedSeqFlow, token.id);
          }

          if (obj.isInclusiveGateway) {
            delta.setIGSeqsToExpect(obj.bpmnId, obj.expectedInFlows);
            delta.setIGSeqToFinish(obj.bpmnId, obj.attachedSeqFlow, token.id);
          }

          if (obj.isMultiInstanceLoop) {
            try {
              if (obj.hasCollection) {
                /* Delta Process Variables that are not yet applied on the process-instance should also be available */
                let inVariables = Object.assign({}, delta.processVariables);

                var collection = sandbox.evaluateExpression(options, obj.collection, message, self, inVariables);
                if (typeof collection === 'undefined') {
                  throw new Error('collection in multi instance is undefined.');
                }
                if (collection.constructor.name !== 'Array') {
                  throw new Error('defined collection in multi instance is not an arary');
                }
                token.nrOfInstances = collection.length;
                token.collection = collection;
                token.elementVariable = obj.elementVariable;
              } else if (obj.hasLoopCardinality) {
                var loopcounter = sandbox.evaluate$Expression(options, obj.loopcounter, message, self);
                token.nrOfInstances = Number(loopcounter);
              } else {
                throw new Error('invalid multi instance specification error');
              }
            } catch (err) {
              log.error(options, err);
              return next(err);
            }

            if (obj.isSequential) {
              token.nrOfActiveInstances = 1;
              token.isSequential = true;
            } else {
              token.nrOfActiveInstances = token.nrOfInstances;
              token.isParallel = true;
            }

            if (obj.hasCompletionCondition) {
              token.hasCompletionCondition = true;
              token.completionCondition = obj.completionCondition;
            }

            token.nrOfCompleteInstances = 0;
          }

          log.debug(options, token);
          if (token === null) {
            log.error(options, 'Invalid token');
            return next(new Error('Invalid token'));
          }
          delta.addToken(token);
        }
      }

      /** Mark the token complete
       * Recurring timers would send flowObjectToken.keepActive=true
      */
      if (!flowObjectToken.keepActive) {
        delta.setTokenToRemove(flowObjectToken.id);
      }
    }

    // add boundary event tokens to interrupt for the currentFlowObject that we are completing, if any
    if (processDefinitionInstance.processDefinition.boundaryEventsByAttachmentIndex[flowObjectToken.bpmnId]) {
      var boundaryEvents = processDefinitionInstance.processDefinition.boundaryEventsByAttachmentIndex[flowObjectToken.bpmnId];
      for (i = 0; i < boundaryEvents.length; i++) {
        var boundaryEvent = boundaryEvents[i];
        var boundaryEventToken = self.getTokenByFlowObject(boundaryEvent);
        if (boundaryEventToken && boundaryEventToken.status === 'pending') {
          delta.setTokenToInterrupt(boundaryEventToken.id);
        }
      }
    }

    self.commit(options, delta, processDefinitionInstance, function commitCb(err, instance) {
      if (err) {
        // If there are no changes to apply then we don't have to emit further events.
        log.error(options, err.message);
        return next(err);
      }

      if (instance._status === 'complete') {
        instance.parentProcess({}, options, function fetchParentProcess(err, parentProcess) {
          /* istanbul ignore if*/
          if (err) {
            return log.error(options, err.message);
          }

          // This is to allow a subprocess to not go to the parent process unless all the subflows have ended
          if (parentProcess) {
            ProcessInstance.emit(SUBPROCESS_END_EVENT, options, parentProcess, instance.parentToken, instance._processVariables);
          }
        });
      }

      /**
       * Once multi instance completes due to all iterations or completion condition we will reach here
       */
      if (currentFlowObject.isMultiInstanceLoop) {
        flowObjectToken = instance._processTokens[flowObjectToken.id];
        if (flowObjectToken.isSequential) {
          if (flowObjectToken.nrOfActiveInstances === 1 && flowObjectToken.status === 'pending') {
            flowObjectToken.inVariables = flowObjectToken.inVariables || {};
            let index = flowObjectToken.nrOfCompleteInstances ? flowObjectToken.nrOfCompleteInstances : 0;
            flowObjectToken.inVariables._iteration = index + 1;
            if (flowObjectToken.collection && flowObjectToken.elementVariable) {
              flowObjectToken.inVariables[flowObjectToken.elementVariable] = flowObjectToken.collection[index];
            }

            ProcessInstance.emit(TOKEN_ARRIVED_EVENT, options, ProcessInstance, instance, flowObjectToken);
            return next();
          } else if (flowObjectToken.nrOfActiveInstances === 1 && flowObjectToken.status !== 'pending') {
            // nrOfActiveInstances still remaining cause of completion condition
            // no need to interrupt anything cause its sequential
          }
        } else if (flowObjectToken.isParallel) {
          // console.log('359 - flowObjectToken.isParallel');
          if (flowObjectToken.nrOfCompleteInstances !== flowObjectToken.nrOfInstances && (flowObjectToken.status === 'pending')) {
            return next();
          } else if (flowObjectToken.nrOfCompleteInstances !== flowObjectToken.nrOfInstances && flowObjectToken.status !== 'pending') {
            // all multi instance have not completed but the token has completed, due to completion condition
            // we need to interrupt tasks/subprocess corresponding to this token which are not complete, before continuing
            if (currentFlowObject.isUserTask) {
              let Task = ProcessInstance.app.models.Task;

              // interrupting after timeout because task completion happens after process state update which will would not have updated to complete by this time
              setTimeout(function interruptTaskAfterSomeTime() {
                Task.find({
                  where: {
                    and: [{
                      processTokenId: flowObjectToken.id
                    }, {
                      status: 'pending'
                    }]
                  }
                }, options, function fetchTask(err, tasks) {
                  /* istanbul ignore if*/
                  if (err) {
                    return log.error(options, err);
                  }

                  for (let i = 0; i < tasks.length; i++) {
                    let task = tasks[i];
                    Task.emit('TASK_INTERRUPT_EVENT', options, Task, task);
                    log.debug(options, 'Signal sent to Task with id ' + task.id + ' to interrupt [Completion condition MI].');
                  }
                });
              }, 1000);
            } else if (currentFlowObject.isSubProcess || currentFlowObject.isCallActivity) {
              ProcessInstance.find({
                where: {
                  and: [{
                    _status: 'running'
                  }, {
                    parentProcessInstanceId: instance.id
                  }]
                }
              }, options, function fetchUnCompletedSubPrcess(err, instances) {
                if (err) {
                  return log.error(options, err);
                }
                let filteredInstances = instances.filter(function filterOnToken(fInstance) {
                  return fInstance.parentToken && fInstance.parentToken.id === flowObjectToken.id;
                });
                filteredInstances.forEach(function interruptSubProcesses(_subProcess) {
                  ProcessInstance.emit(SUBPROCESS_INTERRUPT_EVENT, options, ProcessInstance, _subProcess);
                });
              });
            }
          }
        }
      }

      for (var i in delta.tokens) {
        if (Object.prototype.hasOwnProperty.call(delta.tokens, i)) {
          var token = delta.tokens[i];
          token = instance._processTokens[token.id];

          /**
           * In case of parallel and sequential new tokens will be created only
           * when all instances end
           **/
          if (!token) {
            break;
          }
          if (token.isSequential) {
            token.inVariables = token.inVariables || {};
            token.inVariables._iteration = 1;
            if (token.collection && token.elementVariable) {
              token.inVariables[token.elementVariable] = token.collection[0];
            }
          }
          // TODO : why this check token.id !== delta.tokenToRemove
          if (token.isParallel) {
            var loopcount = token.nrOfInstances;
            var counter = 0;
            while (counter < loopcount) {
              token.inVariables = token.inVariables || {};
              if (token.elementVariable) {
                token.inVariables[token.elementVariable] = token.collection[counter];
              }
              token.inVariables._iteration = counter;
              var _token = _.cloneDeep(token);
              // console.log('437 - Parallel ', counter , ' of ', loopcount);
              ProcessInstance.emit(TOKEN_ARRIVED_EVENT, options, ProcessInstance, instance, _token);
              counter++;
            }
          } else {
            // console.log('441 - ', currentFlowObjectName,  ' -> ', token.name);
            ProcessInstance.emit(TOKEN_ARRIVED_EVENT, options, ProcessInstance, instance, token);
          }
        }
      }
      next();
    });
  };

  ProcessInstance.prototype.recover = function recover() {
    var self = this;
    var tokens = self._processTokens;
    var options = self._workflowCtx || {};
    Object.keys(tokens).filter(function filterPendingTokens(tokenId) {
      /** Emit any pending token.
       * Do not emit durableTimeout tokens as they will be emitted by periodic checks separately */
      return tokens[tokenId].status === 'pending' && !tokens[tokenId].isDurableTimeout;
    }).forEach(function continueWorkflow(tokenId) {
      self.reemit(tokens[tokenId], options, null);
    });
  };

  ProcessInstance.prototype.getSubProcessByToken = function getSubProcessByToken(token, instance, options, next) {
    instance.subProcesses({}, options, function fetchSubProcess(err, subprocesses) {
      /* istanbul ignore if*/
      if (err) {
        return next(err);
      }
      var subprocess = subprocesses.filter(function filterTokenSubProcess(proc) {
        if (proc.parentToken && proc.parentToken.name === token.name && proc.parentToken.id === token.id) {
          return true;
        }
        return false;
      });
      if (subprocess.length === 0) {
        var error = new Error('No subprocess for the call-activity/sub-process token found.');
        return next(error);
      } else if (subprocess.length > 1) {
        var errorx = new Error('Multiple subprocesses for the call-activity/sub-process token found.');
        return next(errorx);
      }
      next(null, subprocess[0]);
    });
  };

  ProcessInstance.prototype.reemit = function reemit(token, options, next) {
    var instance = this;
    next = next || function dummy() {};

    var currentFlowObjectName = token.name;

    instance.processDefinition(options, function fetchDefn(err, processDefinitionInstance) {
      /* istanbul ignore if*/
      if (err) {
        log.error(options, err);
        return next(err);
      }
      var currentFlowObject = processDefinitionInstance.getFlowObjectByName(currentFlowObjectName);

      if (currentFlowObject.isMultiInstanceLoop && !currentFlowObject.isSequential && token.isParallel) {
        for (var i = 0; i < token.nrOfActiveInstances; i++) {
          token.inVariables = token.inVariables || {};
          if (token.elementVariable && token.collection) {
            token.inVariables[token.elementVariable] = token.collection[i];
          }
          token.inVariables._iteration = i;
          var _token = _.cloneDeep(token);

          ProcessInstance.emit(TOKEN_ARRIVED_EVENT, options, ProcessInstance, instance, _token);
        }
      } else if (currentFlowObject.isCallActivity || currentFlowObject.isSubProcess) {
        // check if call Activity has created a process, if not only then emit
        instance.getSubProcessByToken(token, instance, options, function fetchSubProcess(err, subprocess) {
          /* istanbul ignore if*/
          if (err) {
            log.error(options, err);
            return next(err);
          }
          if (subprocess._status === 'complete') {
            // sub process is already complete move the token forward for the parent workflow
            // this condition is very less likely
            ProcessInstance.emit(TOKEN_ARRIVED_EVENT, options, ProcessInstance, instance, token);
          } else {
            // wait, sub process on its own will complete the token
          }
        });
      } else if (currentFlowObject.isTimerEvent) {
        var recoveryPayload;
        if (currentFlowObject.timeDuration) {
          var at = token.startTime;
          if (typeof at === 'string') {
            at = new Date(at);
          }
          var now = Date.now();
          // calculating again to handle pending timeout
          var diff = now - at;
          recoveryPayload = {
            _diff: diff,
            applicableTo: function applicableTo(flowObject) {
              return (currentFlowObject.isTimerEvent && currentFlowObject.timeDuration);
            }
          };
        } else if (currentFlowObject.timeDate) {
          recoveryPayload = {
            keepActive: token.keepActive,
            applicableTo: function applicableTo(flowObject) {
              return (currentFlowObject.isTimerEvent && currentFlowObject.timeDate);
            }
          };
        }
        ProcessInstance.emit(TOKEN_ARRIVED_EVENT, options, ProcessInstance, instance, token, null, recoveryPayload);
      } else if (currentFlowObject.isUserTask) {
        instance.tasks({
          where: {
            name: currentFlowObject.name
          }
        }, options, function fetchTaskToVerifyIfExists(err, tasks) {
          /* istanbul ignore if */
          if (err) {
            log.error(options, err);
            return next(err);
          }
          if (tasks.length === 0) {
            // in case of recovery if user task was not created but token exists then we need to emit token
            ProcessInstance.emit(TOKEN_ARRIVED_EVENT, options, ProcessInstance, instance, token);
          }
        });
      } else {
        ProcessInstance.emit(TOKEN_ARRIVED_EVENT, options, ProcessInstance, instance, token);
      }

      next();
    });
  };

  /**
   * App update calls to the process-instance have to be done using this method
   * This is required to ensure atomic update to the process-instance.
   * Try to apply the delta(change in the state to the process instance) to the latest
   * Throws an error if there are no changes to apply.
   * @param  {Object}   options Options
   * @param  {Object}   delta   Process-State-Delta
   * @param  {Object}   processDefinitionInstance processDefinitionInstance
   * @param  {Function} next    Callback
   * @returns {void}
   */
  ProcessInstance.prototype.commit = function commitFunction(options, delta, processDefinitionInstance, next) {
    if (typeof processDefinitionInstance === 'function') {
      next = processDefinitionInstance;
    }
    var self = this;
    var changes = delta.apply(self, processDefinitionInstance, options);
    // console.log(delta);
    if (changes === null) {
      var err = new Error('trying to make invalid state change');
      // log debug instead of log error cause some other node might have interuppted or completed the process
      log.debug(options, 'trying to make invalid state change');
      return next(err);
    }

    // console.log('Updating: ', self._version, changes._version);
    // console.log(Object.values(changes._processTokens).map(v => {return {name: v.name, status: v.status}}));


    /** Ideally self.updateAttributes is good for most of the cases
     * However, if self.updateAttributes fails due to parallel updates
     * the 'self' is already modified/contaminated by updateAttributes method.
     * When self is parallely accessed by another execution path,
     * the subsequent call to commit will refer to the updated attributes/tokens
     * which failed update in the DB.
     * A retry of the original failed update results in error since this time it finds
     * the original token to be completed is already marked completed accidentally in another path.
     * So select the record and update it rather than 'self'.
     */
    ProcessInstance.findById(self.id, options, function updatePI(err, instance) {
      if (err) {
        log.error(options, 'Error Selecting : ' + err.message);
        instance = self;
      }
      // Do not set version again. Selecting new record is purely for not poluting 'this' instance.
      instance.updateAttributes(changes, options, function updatePI(err, instance) {
        if (err) {
          log.debug(options, err.message + ' while completing ', delta.tokenToRemove);
          setImmediate(retryCommit, options);
        } else {
          next(null, instance);
          /* Proposed changes */
          // console.log('Emitting ', instance.processDefinitionName + '-' + instance._status);
          ProcessInstance.emit(instance.processDefinitionName + '-' + instance._status, {instance: instance, delta: delta});
          /* End Proposed changes */
        }
      });
    });
    function retryCommit(options) {
      ProcessInstance.findById(self.id, options, function fetchPI(err, instance) {
        /* istanbul ignore if*/
        if (err) {
          log.error(options, err);
          return next(err);
        }
        instance.commit(options, delta, processDefinitionInstance, next);
      });
    }
  };

  /**
   * Finding a processToken if the name of the flow Object is given
   * @param  {Object} flowObject FlowObject
   * @return {Object} Process-Token
   */
  ProcessInstance.prototype.findToken = function findToken(flowObject) {
    var self = this;
    var token = null;
    var name = 'name';
    for (var key in self._processTokens) {
      if (Object.prototype.hasOwnProperty.call(self._processTokens, key) && self._processTokens[key][name] === flowObject[name]) {
        token = self._processTokens[key];
      }
    }
    return token;
  };

  /**
   * Finding whether a given flowObject has a token in the process Tokens list
   * @param  {Object} flowObject FlowObject
   * @returns {Boolean} Return true if Process Token is pending
   */
  ProcessInstance.prototype.isPending = function isPending(flowObject) {
    var self = this;
    var result = false;
    var status = 'status';
    var name = 'name';

    for (var key in self._processTokens) {
      if (self._processTokens[key][name] === flowObject[name] && self._processTokens[key][status] === 'pending') {
        result = true;
      }
    }

    return result;
  };

  /**
   * register timer events
   * @param  {Object} options          Options
   * @param  {Object} currentFlowObject  currentFlowObject
   */
  ProcessInstance.prototype._registerTimerEvents = function _registerTimerEvents(options, currentFlowObject) {
    var self = this;
    var delta = new StateDelta();

    if (currentFlowObject.isStartEvent) {
      var startEvent = currentFlowObject;
      log.debug(options, 'Token was put on \'' + startEvent.name);
      timerEvents.addStartTimerEvent(delta, options, ProcessInstance, self, startEvent);
    } else if (currentFlowObject.isIntermediateCatchEvent) {
      var intermediateEvent = currentFlowObject;
      log.debug(options, 'Token was put on \'' + intermediateEvent.name);
      timerEvents.addIntermediateTimerEvent(delta, options, ProcessInstance, self, intermediateEvent);
    } else if (currentFlowObject.isBoundaryEvent) {
      var boundaryEvent = currentFlowObject;
      log.debug(options, 'Token was put on \'' + boundaryEvent.name);
      timerEvents.addBoundaryTimerEvent(delta, options, ProcessInstance, self, boundaryEvent);
    } else {
      log.error(options, 'Unknown type of Timer Event being requested.');
    }
  };

  /* Unused Function */
  // ProcessInstance.prototype.getFlowObjectByToken = function getFlowObjectByToken(token, options, next) {
  //   var self = this;
  //   self.processDefinition({}, options, function fetchPD(err, processDefinitionInstance) {
  //     if (err) {
  //       log.error(options, err);
  //       return next(err);
  //     }
  //     next(null, processDefinitionInstance.getProcessElement(token.bpmnId));
  //   });
  // };

  ProcessInstance.prototype.getTokenByFlowObject = function getTokenByFlowObject(flowobject) {
    var self = this;
    var processTokens = self._processTokens;
    for (var i in processTokens) {
      if (Object.prototype.hasOwnProperty.call(processTokens, i) && processTokens[i].bpmnId === flowobject.bpmnId && processTokens[i].status === 'pending') {
        return processTokens[i];
      }
    }
    return null;
  };


  /**
   * clear boundary timer events
   * @param  {Object} delta               Process-State-Delta
   * @param  {Object} options             Options
   * @param  {Object} currentFlowObject   CurrentFlowObject
   */
  ProcessInstance.prototype._clearBoundaryTimerEvents = function _clearBoundaryTimerEvents(delta, options, currentFlowObject) {
    var self = this;
    self.processDefinition({}, options, function fetchPD(err, processDefinitionInstance) {
      if (err) {
        return log.error(options, err);
      }
      var boundaryEvents = processDefinitionInstance.getBoundaryEventsAt(currentFlowObject);
      boundaryEvents.forEach(function iterateBoundaryEvents(boundaryEvent) {
        if (boundaryEvent.isTimerEvent) {
          timerEvents.removeTimeout(delta, boundaryEvent.name);
        }
      });
    });
  };

  /**
   * terminate Sub-Processes
   * @param  {Object} options     Options
   * @param  {Object} flowObject  FlowObject
   * @param  {Object} message     Message
   */
  ProcessInstance.prototype._terminateSubProcesses = function _terminateSubProcesses(options, flowObject, message) {
    var self = this;
    var evaluatedProcessName = flowObject.subProcessId;
    if (flowObject.isCallActivity) {
      evaluatedProcessName = sandbox.evaluate$Expression(options, flowObject.subProcessId, message, self);
    }

    var filter = {
      where: {
        'processDefinitionName': evaluatedProcessName,
        '_status': 'running'
      }
    };
    self.subProcesses(filter, options, function fetchSP(err, subProcesses) {
      /* istanbul ignore if*/
      if (err) {
        log.error(options, err);
      }
      for (var i in subProcesses) {
        if (Object.prototype.hasOwnProperty.call(subProcesses, i)) {
          ProcessInstance.emit(SUBPROCESS_INTERRUPT_EVENT, options, ProcessInstance, subProcesses[i]);
        }
      }
    });
  };

  ProcessInstance.prototype.revertProcessToPending = function revertProcessToPending(tokenId, variables, options, next) {
    var self = this;
    var delta = new StateDelta();
    variables = variables || [];

    Object.keys(variables).forEach(function addToDelta(key) {
      delta.addProcessVariable(key, variables[key]);
    });
    delta.setTokenToPending(tokenId);

    self.commit(options, delta, function commitCb(err, instance) {
      if (err) {
        log.error(options, err);
      }
      return next(err, instance);
    });
  };

  ProcessInstance.prototype.failureTokens = function failureTokens(options, next) {
    var inst = this;
    // backward compatibility in ci
    Object.values = function values(obj) {
      return Object.keys(obj).map(key => {
        return obj[key];
      });
    };
    var tokens = Object.values(inst._processTokens).filter(token => {
      return token.status === 'failed';
    });
    return next(null, tokens);
  };

  ProcessInstance.retryAll = function retryAll(filter, data, options, next) {
    filter = filter || {};
    data = data || {};
    ProcessInstance.find(filter, options, function fetchPDs(err, insts) {
      /* istanbul ignore if*/
      if (err) {
        log.error(options, err);
        return next(err);
      }

      // backward compatibility in ci
      Object.values = function values(obj) {
        return Object.keys(obj).map(key => {
          return obj[key];
        });
      };
      var dummyCb = function dummyCb() {};
      insts.forEach(inst => {
        Object.values(inst._processTokens).filter(token => {
          return token.status === 'failed';
        }).forEach(token => {
          inst.retry(token.id, data, options, dummyCb);
        });
      });

      return next(null, {
        emitted: true
      });
    });
  };

  ProcessInstance.failures = function failures(filter, options, next) {
    filter = filter || {};
    // if (filter.bpmnData === true) {
    //   filter.include = {
    //     processDefinition: 'bpmndata'
    //   };
    // }
    filter.where = filter.where || {};
    filter.where._status = filter.where._status || {
      inq: ['pending', 'running', 'running']
    };

    ProcessInstance.find(filter, options, function fetchPDs(err, insts) {
      /* istanbul ignore if*/
      if (err) {
        log.error(options, err);
        return next(err);
      }

      // if (filter.bpmnData === true) {
      //   insts = insts.map(inst => {
      //     inst.bpmndata = inst.toObject().processDefinition.bpmndata;
      //     delete inst.processDefinition;
      //     return inst;
      //   });
      // }
      // delete filter.bpmndata;

      // backward compatibility in ci
      Object.values = function values(obj) {
        return Object.keys(obj).map(key => {
          return obj[key];
        });
      };
      return next(null, insts.filter(inst => {
        return Object.values(inst._processTokens).filter(token => {
          return token.status === 'failed';
        }).length > 0;
      }));
    });
  };

  ProcessInstance.prototype.retry = function retry(tokenId, processVariables, options, next) {
    var self = this;

    var tokens = self._processTokens;
    // backward compatibility in ci
    Object.values = function values(obj) {
      return Object.keys(obj).map(key => {
        return obj[key];
      });
    };
    var filteredTokens = Object.values(tokens).filter(t => {
      return t.id === tokenId;
    });
    if (filteredTokens.length !== 1) {
      let err = new Error('invalid-token-id');
      // log.error(options, err);
      return next(err);
    }
    var token = filteredTokens[0];
    if (token.status !== 'failed') {
      let err = new Error('invalid-token-status');
      // status code 428 for Precondition Required
      err.statusCode = 428;
      // log.error(options, err);
      return next(err);
    }

    return new Promise((resolve, reject) => {
      self.revertProcessToPending(token.id, processVariables, options, function cb(err, instance) {
        if (err) {
          return reject(err);
        }
        resolve(instance);
      });
    })
      .then(process => {
        /* Refresh and emit the the updated token */
        token = process._processTokens[token.id];
        // updated process is available with latest process variables and pending state
        return new Promise((resolve, reject) => {
          process.reemit(token, options, function cb(err) {
            if (err) {
              return reject(err);
            }
            return resolve({
              emitted: true
            });
          });
        });
      })
      .then(function done(response) {
        return next(null, response);
      })
      .catch(function errCb(err) {
        log.error(options, err);
        return next(err);
      });
  };

  ProcessInstance.remoteMethod('failures', {
    accessType: 'READ',
    accepts: [{
      arg: 'filter',
      type: 'object',
      http: {
        source: 'query'
      },
      description: 'Filter defining fields, where, include, order, offset'
    },
    {
      arg: 'options',
      type: 'object',
      http: 'optionsFromRequest'
    }],
    description: 'Find all failed process instances.',
    http: {
      verb: 'get'
    },
    isStatic: true,
    returns: {
      type: 'object',
      root: true
    }
  });

  ProcessInstance.remoteMethod('retryAll', {
    accessType: 'WRITE',
    accepts: [{
      arg: 'filter',
      type: 'object',
      http: {
        source: 'query'
      },
      description: 'Filter defining fields, where, include, order, offset'
    }, {
      arg: 'data',
      type: 'object',
      http: {
        source: 'body'
      },
      description: 'Update Process Variables'
    },
    {
      arg: 'options',
      type: 'object',
      http: 'optionsFromRequest'
    }],
    description: 'Retry all failed tokens in fetched Process Instances.',
    http: {
      verb: 'put',
      path: '/retryAll'
    },
    isStatic: true,
    returns: {
      type: 'object',
      root: true
    }
  });

  ProcessInstance.remoteMethod('failureTokens', {
    accessType: 'READ',
    description: 'Find failed tokens for a particular process instances',
    accepts: [{
      arg: 'options',
      type: 'object',
      http: 'optionsFromRequest'
    }],
    http: {
      verb: 'get',
      path: '/failureTokens'
    },
    isStatic: false,
    returns: {
      type: 'object',
      root: true
    }
  });

  ProcessInstance.remoteMethod('retry', {
    accessType: 'WRITE',
    accepts: [{
      arg: 'tokenId',
      type: 'string',
      http: {
        source: 'path'
      },
      description: 'Failed token id'
    }, {
      arg: 'data',
      type: 'object',
      http: {
        source: 'body'
      },
      description: 'Update Process Variables'
    }, {
      arg: 'options',
      type: 'object',
      http: 'optionsFromRequest'
    }],
    description: 'Retry a failed Task in a failed Process Instance.',
    http: {
      verb: 'put',
      path: '/retry/:tokenId'
    },
    isStatic: false,
    returns: {
      type: 'object',
      root: true
    }
  });
};
