/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
/**
 * Implemention of User task Management
 * @author Kangan Verma(kangan06), Mandeep Gill(mandeep6ill), Nirmal Satyendra(iambns), Prem Sai(premsai-ch), Vivek Mittal(vivekmittal07)
 */

var loopback = require('loopback');
var logger = require('oe-logger');
var log = logger('Task');

var taskEventHandler = require('./lib/workflow-eventHandlers/taskeventhandler.js');
var TASK_INTERRUPT_EVENT = 'TASK_INTERRUPT_EVENT';

module.exports = function Task(Task) {
  Task.disableRemoteMethod('create', true);
  Task.disableRemoteMethod('upsert', true);
  Task.disableRemoteMethod('updateAll', true);
  Task.disableRemoteMethod('updateAttributes', false);
  Task.disableRemoteMethod('deleteById', true);
  Task.disableRemoteMethod('deleteById', true);
  Task.disableRemoteMethod('createChangeStream', true);
  Task.disableRemoteMethod('updateById', true);
  Task.disableRemoteMethod('deleteWithVersion', true);

  Task.on(TASK_INTERRUPT_EVENT, taskEventHandler._taskInterruptHandler);

  Task.observe('after accesss', function restrictDataCb(ctx, next) {
    if (ctx && ctx.options && ctx.options._skip_tf === true) {
      // instance to be read internally by workflow
      delete ctx.options._skip_tf;
      return next();
    }

    if (ctx && ctx.options && ctx.options.fetchAllScopes === true) {
      // don't filter
      return next();
    }

    var instances = ctx.accdata;
    var resultData = [];

    for (var i = 0; i < instances.length; i++) {
      var instance = instances[i];
      var self            = instance;
      var callContext     = ctx.options.ctx;
      var currUser        = callContext.username  || 'undefined';
      var currRoles       = callContext.roles     || [];
      var currGroup       = callContext.department || 'undefined';
      var candidateUsers  = self.candidateUsers   || [];
      var excludedUsers   = self.excludedUsers    || [];
      var candidateRoles  = self.candidateRoles   || [];
      var excludedRoles   = self.excludedRoles    || [];
      var candidateGroups = self.candidateGroups  || [];
      var excludedGroups  = self.excludedGroups   || [];

      var finalCall = userMatch(currUser, candidateUsers, excludedUsers);
      if (finalCall === -1) {
        continue;
      } else if (finalCall === 1) {
        // the user was found as a part of candidateUser, won't check for excluded Role [ inconsistencies have to resolved in bpmn itself ]
        resultData.push(instance);
        continue;
      } else {
        finalCall = roleMatch(currRoles, candidateRoles, excludedRoles);
        if (finalCall === -1) {
          continue;
        } else if (finalCall === 1) {
          // user is part of authorized roles
          resultData.push(instance);
          continue;
        } else {
          finalCall = groupMatch(currGroup, candidateGroups, excludedGroups);
          if (finalCall === -1) {
            continue;
          } else if (finalCall === 1) {
            // the user was found as a part of candidateUser, won't check for excluded Role [ inconsistencies have to resolved in bpmn itself ]
            resultData.push(instance);
            continue;
          } else {
            continue;
          }
        }
      }
    }

    function groupMatch(group, candidateGroups, excludedGroups) {
      if (candidateGroups.indexOf(group) !== -1 ) {
        // group found
        return 1;
      } else if (excludedGroups.indexOf(group) !== -1) {
        // no further check needed for excluded group
        return -1;
      }
      // group match was unsuccessfully, look for role match
      return 0;
    }

    function roleMatch(roles, candidateRoles, excludedRoles) {
      var allowedMatch = roles.filter(function filterAllowedRole(currRole) {
        return candidateRoles.indexOf(currRole) !== -1;
      });

      var unallowedMatch = roles.filter(function filterUnallowedRole(currRole) {
        return excludedRoles.indexOf(currRole) !== -1;
      });

      if (allowedMatch.length > 0 && unallowedMatch.length === 0) {
        // candidate role match & no excluded match, user is authorized
        return 1;
      } else if (unallowedMatch.length > 0) {
        // user is part of excluded role
        return -1;
      }
      // user is not a part of candidate role but may or may not be a part of excluded role
      return 0;
    }

    function userMatch(user, candidateUsers, excludedUsers) {
      if (candidateUsers.indexOf(user) !== -1 ) {
        // user found
        return 1;
      } else if (excludedUsers.indexOf(user) !== -1) {
        // no further check needed for excluded user
        return -1;
      }
      // user match was unsuccessfully, look for role match
      return 0;
    }

    ctx.accdata = resultData;
    next();
  });

  /**
   * To be DEPRECATED soon, Please use /complete instead
   * REST endpoint for completing User-Task
   * @param  {Object}   message           Message
   * @param  {Object}   processVariables  Process-Variables
   * @param  {Object}   options           Options
   * @param  {Function} next              Callback
   * @returns {void}
   */
  Task.prototype.completeTask = function completeTask(message, processVariables, options, next) {
    var self = this;
    if (self.status !== 'pending') {
      return next(new Error('Task Already Completed'));
    }
    self.processInstance({}, options, function fetchPI(err, processInstance) {
      if (err) {
        log.error(options, err);
        return next(err);
      }
      var workflowCtx = processInstance._workflowCtx;
      processInstance._completeTask(workflowCtx, self, message, processVariables, taskCompleteCallback);
      function taskCompleteCallback(err) {
        var status = 'complete';
        if (err) {
          if (err.message === 'Trying to make an invalid change to the process state') {
            status = 'interrupted';
          } else {
            return next(err);
          }
        }
        // self.status = status;
        var updates = { 'status': status, '_version': self._version };
        self.updateAttributes(updates, options, function saveTask(saveError, instance) {
          if (err || saveError) {
            log.error(options, err, saveError);
            return next(err || saveError);
          }
          next(null, instance);
        });
      }
    });
  };

  Task.prototype.complete = function complete(data, options, next) {
    var self = this;
    var tname = self.name;
    self.processInstance({}, options, function fetchProcessDef(err, process) {
      if (err) {
        log.error(options, err);
        return next(err);
      }
      process.processDefinition({}, options, function fetchProcessDef(err, processDef) {
        if (err) {
          log.error(options, err);
          return next(err);
        }
        var pdata;
        var workflowInstanceId;
        var WorkflowManager;
        let taskObj = processDef.getFlowObjectByName(tname);
        if (taskObj.isMultiMaker) {
          // this task is a maker user task, so no need to have pv and msg and directly take obj as update
          // TODO : validate the object first
          var updates = data;
          pdata = {};
          if (typeof data.pv !== 'undefined') {
            pdata.pv = data.pv;
            delete updates.pv;
          }
          if (typeof data.msg !== 'undefined') {
            pdata.msg = data.msg;
            delete updates.msg;
          }
          var ChangeWorkflowRequest = loopback.getModel('ChangeWorkflowRequest', options);
          ChangeWorkflowRequest.find({
            where: {
              and: [{
                modelName: process._processVariables._modelInstance._type
              }, {
                modelId: process._processVariables._modelInstance.id
              }]
            }
          }, options, function fetchChangeModel(err, inst) {
            if (err) {
              log.error(options, err);
              return next(err);
            }
            if (inst.length > 1) {
              let err = new Error('Multiple instances found with same id in Change Workflow Request');
              log.error(options, err);
              return next(err);
            } else if (inst.length === 0) {
              // no instance found in change request model
              return next(null, {
                'change_request_update': 'failed - no instance found'
              });
            }

            var operation = inst[0].operation;
            var instx = JSON.parse(JSON.stringify(inst[0].data));
            for (let key in updates) {
              if (Object.prototype.hasOwnProperty.call(updates, key)) {
                var val = updates[key];
                instx[key] = val;
              }
            }

            let modifiers = inst[0]._modifiers || [];
            modifiers.push(options.ctx.username);

            let modelName = process._processVariables._modelInstance._type;
            let Model = loopback.getModel(modelName, options);

            var obj = new Model(data);
            var context;
            if(operation === 'create'){
              context = {
                Model: Model,
                instance: obj,
                isNewInstance: true,
                hookState: {},
                options: options
              };
            } else if(operation === 'update'){
              context = {
                Model: Model,
                instance: obj,
                isNewInstance: true,
                hookState: {},
                options: options
              };
            } else {
              context = {
                Model: Model,
                hookState: {},
                options: options
              };
            }

            var beforeSaveArray = Model._observers['before save'];
            var dpBeforeSave = beforeSaveArray.filter(function(beforeSave){
              return beforeSave.name === 'dataPersonalizationBeforeSave';
            })
            if(dpBeforeSave.length !== 1){
              let err = new Error('DataPersonalizationMixin fetch failed.');
              log.error(options, err);
              return next(err);
            }
            dpBeforeSave[0](context, function beforeSaveCb(err, ctx) {
              if (err) return next(err);

              if(operation === 'update'){
                obj = new Model(ctx.data);
              }
              obj.isValid(function validate(valid) {
                if (valid) {
                  log.debug(options, 'Instance has been validated during maker checker creation');

                  inst[0].updateAttributes({
                    data: instx,
                    _modifiers: modifiers
                  }, options, function updateCM(err, res) {
                    if (err) {
                      log.error(options, err);
                      return next(err);
                    }
                    // process._processVariables._modelInstance = instx;
                    var xdata = {};
                    xdata.pv = pdata.pv || {};
                    xdata.pv._modelInstance = instx;
                    xdata.msg = pdata.msg;
                    return self.complete_(xdata, options, next);
                  });
                } else {
                  let err = new Error('Validation Error');
                  log.error(options, err);
                  return next(err);
                }
              }, context, instx);
            });
          });
        } else if (taskObj.isChecker) {
          // do handling of finalize transaction first, only then complete the task
          // user task wont complete till finalize transaction is successful
          WorkflowManager = loopback.getModel('WorkflowManager', options);
          workflowInstanceId = process._processVariables._workflowInstanceId;

          if ( typeof data.__action__ === 'undefined' ) {
            let err = new Error('__action__ not provided. Checker enabled task requires this field.');
            log.error(options, err);
            return next(err);
          }

          let validActArr = [ 'approved', 'rejected' ];
          if ( taskObj.stepVariables && taskObj.stepVariables.__action__ ) {
            validActArr = validActArr.concat(taskObj.stepVariables.__action__);
          }

          let isValid = ( validActArr.indexOf(data.__action__) > -1 );
          if (!isValid) {
            let err = new Error('Provided action is not valid. Possible valid actions : ' + JSON.stringify(validActArr));
            log.error(options, err);
            return next(err);
          }

          pdata = {
            pv: {}
          };
          if (typeof data.pv !== 'undefined') {
            pdata.pv = data.pv;
          }
          if (typeof data.msg !== 'undefined') {
            pdata.msg = data.msg;
          }
          pdata.pv.__action__ = data.__action__;

          ChangeWorkflowRequest = loopback.getModel('ChangeWorkflowRequest', options);
          ChangeWorkflowRequest.find({
            where: {
              'workflowInstanceId': workflowInstanceId
            }
          }, options, function fetchRM(err, requests) {
            if (err) {
              log.error(options, 'unable to find request to end', err);
              return next(err);
            }
            if (requests.length === 0) {
              let errInvalidid;
              errInvalidid = new Error('No corresponding workflow request found for verification update the Maker-Checker Process.');
              log.error(options, errInvalidid);
              return next(errInvalidid);
            }
            if (requests.length > 1) {
              let errInvalidid;
              errInvalidid = new Error('Multiple workflow requests found for verification update the Maker-Checker Process.');
              log.error(options, errInvalidid);
              return next(errInvalidid);
            }
            var request = requests[0];
            let _verifiedBy = 'workflow-system';
            if (options.ctx && options.ctx.username) {
              _verifiedBy = options.ctx.username;
            }
            let updates = {
              _verifiedBy: _verifiedBy
            };
            request.updateAttributes(updates, options, function updateVerifiedByField(err, inst) {
              if (err) {
                log.error(options, 'error in updating change workflow instance verifiedBy field', err);
                return next(err);
              }
              log.debug(options, 'updated verified by field in change request by checker');
              return self.complete_(pdata, options, next);
            });
          });
        } else if (taskObj.isCheckerAutoFinalize) {
          // do handling of finalize transaction first, only then complete the task
          // user task wont complete till finalize transaction is successful
          WorkflowManager = loopback.getModel('WorkflowManager', options);
          workflowInstanceId = process._processVariables._workflowInstanceId;

          if ( typeof data.__action__ === 'undefined' ) {
            let err = new Error('__action__ not provided. Checker enabled task requires this field.');
            log.error(options, err);
            return next(err);
          }

          let validActArr = [ 'approved', 'rejected' ];
          if ( self.stepVariables && self.stepVariables.__action__ ) {
            validActArr = validActArr.concat(self.stepVariables.__action__);
          }

          let isValid = ( validActArr.indexOf(data.__action__) > -1 );
          if (!isValid) {
            let err = new Error('Provided action is not valid. Possible valid actions : ' + JSON.stringify(validActArr));
            log.error(options, err);
            return next(err);
          }

          var postData = {
            'workflowInstanceId': workflowInstanceId,
            'status': data.__action__
          };

          if (process._processVariables._updates) {
            postData.updates = process._processVariables._updates;
          }

          if (process._processVariables._maker_checker_impl === 'v2') {
            postData.version = 'v2';
          }
          pdata = {
            pv: {}
          };
          if (typeof data.pv !== 'undefined') {
            pdata.pv = data.pv;
          }
          if (typeof data.msg !== 'undefined') {
            pdata.msg = data.msg;
          }
          pdata.pv.__action__ = data.__action__;

          if (['approved', 'rejected'].indexOf(data.__action__) > -1 ) {
            WorkflowManager.endAttachWfRequest(postData, options, function completeMakerCheckerRequest(err, res) {
              if (err) {
                log.error(err);
                return next(err);
              }
              return self.complete_(pdata, options, next);
            });
          } else {
            return self.complete_(pdata, options, next);
          }
        } else {
          return self.complete_(data, options, next);
        }
      });
    });
  };
  /**
   * REST endpoint for completing User-Task
   * @param  {Object}   data              Process-Variables & Message data
   * @param  {Object}   options           Options
   * @param  {Function} next              Callback
   * @returns {void}
   */
  Task.prototype.complete_ = function complete_(data, options, next) {
    var self = this;

    var message = {};
    if (data && data.msg) {
      message = data.msg;
    }

    var processVariables = {};
    if (data && data.pv) {
      processVariables = data.pv;
    }

    if (self.status !== 'pending') {
      return next(new Error('Task Already Completed'));
    }
    self.processInstance({}, options, function fetchPI(err, processInstance) {
      if (err) {
        log.error(options, err);
        return next(err);
      }
      var workflowCtx = processInstance._workflowCtx;
      processInstance._completeTask(workflowCtx, self, message, processVariables, taskCompleteCallback);
      function taskCompleteCallback(err) {
        var status = 'complete';
        if (err) {
          if (err.message === 'Trying to make an invalid change to the process state') {
            status = 'interrupted';
          } else {
            return next(err);
          }
        }
        // self.status = status;
        var updates = {'status': status, '_version': self._version};
        self.updateAttributes(updates, options, function saveTask(saveError, instance) {
          if (err || saveError) {
            log.error(options, err, saveError);
            return next(err || saveError);
          }
          next(null, instance);
        });
      }
    });
  };


  /**
   * REST endpoint for completing User-Task
   * @param  {Object}   data              Process-Variables & Message data
   * @param  {Object}   options           Options
   * @param  {Function} next              Callback
   * @returns {void}
   */
  Task.prototype.delegate = function delegate(data, options, next) {
    var self = this;

    var assignee;
    if (data && data.assignee) {
      assignee = data.assignee;
    } else {
      var error = new Error('Assignee is required to delegate task.');
      log.error(options, error);
      return next(error);
    }

    if (self.status !== 'pending') {
      var errorx = new Error('Task Already Completed');
      log.error(options, errorx);
      return next(errorx);
    }

    var updates = {
      'candidateUsers': [
        assignee
      ],
      'candidateRoles': [],
      'candidateGroups': [],
      'excludedUsers': [],
      'excludedRoles': [],
      'excludedGroups': [],
      'id': self.id,
      '_version': self._version
    };

    self.updateAttributes(updates, options, function cb(err, inst) {
      if (err) {
        log.error(options, err);
        return next(err);
      }
      next(null, inst);
    });
  };

  Task.remoteMethod('completeTask', {
    accessType: 'WRITE',
    accepts: [
      {
        arg: 'Message',
        type: 'object',
        required: false,
        description: 'Message Instance'
      }, {
        arg: 'Process Variables',
        type: 'object',
        required: false,
        description: 'Process Variables Instance'
      }],
    returns: {
      type: 'object',
      root: true
    },
    description: [
      'Sends a request to complete a task, status will be updated latter'
    ],
    http: {
      verb: 'put'
    },
    isStatic: false
  });

  Task.remoteMethod('complete', {
    accessType: 'WRITE',
    accepts: {
      arg: 'data',
      type: 'object',
      http: {
        source: 'body'
      },
      description: 'Task instance'
    },
    description: 'Sends a request to complete a task, status will be updated later',
    http: {
      verb: 'put'
    },
    isStatic: false,
    returns: {
      type: 'object',
      root: true
    }
  });

  Task.remoteMethod('delegate', {
    accessType: 'WRITE',
    accepts: {
      arg: 'data',
      type: 'object',
      http: {
        source: 'body'
      },
      description: 'Task instance'
    },
    description: 'Delegate the assigned task to a different user',
    http: {
      verb: 'put'
    },
    isStatic: false,
    returns: {
      type: 'object',
      root: true
    }
  });
};
