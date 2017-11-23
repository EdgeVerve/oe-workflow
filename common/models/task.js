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
var evaluateJSON = require('./lib/workflow-nodes/service-node.js').evaluateJSON;

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
        self.status = status;

        self.save(options, function saveTask(saveError, instance) {
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
        let taskObj = processDef.getFlowObjectByName(tname);
        if (taskObj.isMultiMaker) {
          // this task is a maker user task, so no need to have pv and msg and directly take obj as update
          // TODO : validate the object first
          var updates = data;
          var pdata = {};
          if(typeof data.pv !== undefined){
            pdata.pv = data.pv;
            delete updates.pv;
          }
          if(typeof data.msg !== undefined){
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
              log.error(ctx, err);
              return next(err);
            }
            if (inst.length > 1) {
              let err = new Error('Multiple instances found with same id in Change Workflow Request');
              log.error(ctx, err);
              return next(err);
            } else if (inst.length === 0) {
              // no instance found in change request model
              return next(null, {
                'change_request_update': 'failed - no instance found'
              });
            }
            var instx = JSON.parse(JSON.stringify(inst[0].data));
            for (let key in updates) {
              if (Object.prototype.hasOwnProperty.call(updates, key)) {
                var val = updates[key];
                instx[key] = val;
              }
            }
            let modifiers = inst[0]._modifiers || [];
            modifiers.push(options.ctx.username);
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
          });
        } else if (taskObj.isFinalizeTransaction) {
         // do handling of finalize transaction first, only then complete the task
          var WorkflowManager = loopback.getModel('WorkflowManager', options);
          var workflowInstanceId = process._processVariables._workflowInstanceId;

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
          var pdata = {};
          if(typeof data.pv !== undefined){
            pdata.pv = data.pv;
          }
          if(typeof data.msg !== undefined){
            pdata.msg = data.msg;
          }

          WorkflowManager.endAttachWfRequest(postData, options, function completeMakerCheckerRequest(err, res) {
            if (err) {
              log.error(err);
              return next(err);
            }
          return self.complete_(pdata, options, next);
            // done(null, msg);
          });
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
        self.status = status;

        self.save(options, function saveTask(saveError, instance) {
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
      verb: 'post'
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
