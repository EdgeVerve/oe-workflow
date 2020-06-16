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

var taskEventHandler = require('../../lib/workflow-eventHandlers/taskeventhandler.js');
var TASK_INTERRUPT_EVENT = 'TASK_INTERRUPT_EVENT';
var dateUtils = require('../../lib/utils/oe-date-utils.js');

module.exports = function Task(Task) {
  Task.disableRemoteMethodByName('create', true);
  Task.disableRemoteMethodByName('upsert', true);
  Task.disableRemoteMethodByName('updateAll', true);
  Task.disableRemoteMethodByName('updateAttributes', false);
  Task.disableRemoteMethodByName('deleteById', true);
  Task.disableRemoteMethodByName('deleteById', true);
  Task.disableRemoteMethodByName('createChangeStream', true);
  Task.disableRemoteMethodByName('updateById', true);
  Task.disableRemoteMethodByName('deleteWithVersion', true);

  Task.on(TASK_INTERRUPT_EVENT, taskEventHandler._taskInterruptHandler);

  function taskApplicable(options, task) {
    var callContext = options.ctx || {};
    var currUser = callContext.username || 'undefined';
    var currRoles = callContext.roles || [];
    var currGroup = callContext.group || 'undefined';
    var candidateUsers = task.candidateUsers || [];
    var excludedUsers = task.excludedUsers || [];
    var candidateRoles = task.candidateRoles || [];
    var excludedRoles = task.excludedRoles || [];
    var candidateGroups = task.candidateGroups || [];
    var excludedGroups = task.excludedGroups || [];

    function groupMatch(group, candidateGroups, excludedGroups) {
      if (candidateGroups.indexOf(group) !== -1) {
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
      if (candidateUsers.indexOf(user) !== -1) {
        // user found
        return 1;
      } else if (excludedUsers.indexOf(user) !== -1) {
        // no further check needed for excluded user
        return -1;
      }
      // user match was unsuccessfully, look for role match
      return 0;
    }

    var finalCall = userMatch(currUser, candidateUsers, excludedUsers);
    if (finalCall === -1) {
      return false;
    } else if (finalCall === 1) {
      // the user was found as a part of candidateUser, won't check for excluded Role [ inconsistencies have to resolved in bpmn itself ]
      return true;
    }
    finalCall = roleMatch(currRoles, candidateRoles, excludedRoles);
    if (finalCall === -1) {
      return false;
    } else if (finalCall === 1) {
      // user is part of authorized roles
      return true;
    }
    finalCall = groupMatch(currGroup, candidateGroups, excludedGroups);
    if (finalCall === -1) {
      return false;
    } else if (finalCall === 1) {
      // the user was found as a part of candidateUser, won't check for excluded Role [ inconsistencies have to resolved in bpmn itself ]
      return true;
    } else if (candidateGroups.length === 0 && candidateRoles.length === 0 && candidateUsers.length === 0) {
      // if the user was not excluded in any way
      // and if candidateUsers, candidateRoles, &
      // candidateGroups were not defined, assume it be candidate
      return true;
    }
    return false;
  }


  /**
   * REST endpoint for getting tasks specific to user
   * @param  {objet}    filter          filter criteria
   * @param  {Object}   options           Options
   * @param  {Function} next              Callback
   */
  Task.filtered = function filtered(filter, options, next) {
    let fieldsToRemove = [];
    filter = filter || {};
    if (filter.fields) {
      let mandatoryFields = ['candidateUsers', 'excludedUsers', 'candidateRoles', 'excludedRoles', 'candidateGroups', 'excludedGroups'];
      mandatoryFields.forEach(function addMandatoryField(val) {
        if (!filter.fields[val]) {
          filter.fields[val] = true;
          fieldsToRemove.push(val);
        }
      });
    }
    filter.where = filter.where || {};
    filter.where.status = filter.where.status || 'pending';
    Task.find(filter, options, function cb(err, results) {
      if (results) {
        results = results.filter(function fcb(task) {
          return taskApplicable(options, task);
        });

        if (fieldsToRemove.length > 0) {
          filter.fields;
          results = results.map(function mcb(task) {
            fieldsToRemove.forEach(function fecb(field) {
              delete task[field];
            });
            return task;
          });
        }
      }
      next(err, results);
    });
  };

  function fetchTheChangeRequest(filter, options, cb) {
    let ChangeWorkflowRequest = loopback.getModel('ChangeWorkflowRequest', options);
    ChangeWorkflowRequest.find(filter, options, function fetchCB(err, requests) {
      /* istanbul ignore if*/
      if (err) {
        return handleError(err, options, cb);
      }
      if (requests.length === 0) {
        return handleError(new Error('No change-request found for given criteria'), options, cb);
      }
      if (requests.length > 1) {
        return handleError(new Error('Multiple change-requests found for given criteria'), options, cb);
      }
      cb(null, requests[0]);
    });
  }

  function handleError(err, options, callback) {
    log.error(options, err);
    callback(err);
  }

  function populateVerifiedBy(model, data, options) {
    if (model && model.getPropertyType('_verifiedBy') === 'String') {
      var _verifiedBy = 'workflow-system';
      if (options && options.ctx && options.ctx.username) {
        _verifiedBy = options.ctx.username;
      }
      data._verifiedBy = _verifiedBy;
    }
  }

  Task.prototype.complete = function complete(data, options, next) {
    var self = this;
    var tname = self.name;
    if (self.status !== 'pending') {
      let error = new Error('Task already completed');
      error.code = 'TASK_ALREADY_COMPLETED';
      error.status = error.statusCode = 409;
      return next(error);
    }
    if (!taskApplicable(options, self)) {
      var error = new Error('Task not assigned to user');
      error.statusCode = error.status = 403;
      error.code = 'TASK_NOT_ASSIGNED';
      return next(error);
    }

    self.processInstance({}, options, function fetchProcessDef(err, process) {
      /* istanbul ignore if*/
      if (err) {
        return handleError(err, options, next);
      }
      process.processDefinition({}, options, function fetchProcessDef(err, processDef) {
        /* istanbul ignore if*/
        if (err) {
          return handleError(err, options, next);
        }
        var pdata;
        var workflowInstanceId;
        var WorkflowManager;
        let taskObj = processDef.getFlowObjectByName(tname);
        let preCompleteFunction = function preCompleteFunction(options, payload, taskInstance, taskDef, cb) {
          /* default do-nothing */
          return cb();
        };
        let workflowAddons = Task.app.workflowAddons || {};
        if (taskObj.completionHook) {
          if (workflowAddons[taskObj.completionHook]) {
            preCompleteFunction = workflowAddons[taskObj.completionHook];
          } else {
            log.error('preComplete function ' + taskObj.completionHook + ' not defined');
          }
        } else if (workflowAddons.defaultTaskCompletionHook) {
          preCompleteFunction = workflowAddons.defaultTaskCompletionHook;
        }

        try {
          /* Invoke with process-instance as 'this' */
          preCompleteFunction.call(process, options, data, self, taskObj, function preCompleteCallback(err) {
            if (err) {
              return next(err);
            }
            if (taskObj.isMultiMaker) {
              // this task is a maker user task, so no need to have pv and msg and directly take obj as update
              var updates = data;
              pdata = {
                __comments__: data.__comments__
              };
              if (typeof data.pv !== 'undefined') {
                pdata.pv = data.pv;
                delete updates.pv;
              }
              if (typeof data.msg !== 'undefined') {
                pdata.msg = data.msg;
                delete updates.msg;
              }
              var modelName = process._processVariables._modelInstance._type;
              var Model = loopback.getModel(modelName, options);
              var modelId = process._processVariables._modelId;
              Model.findById(modelId, options, function fetchCurrentInstance(err, currentInstance) {
                /* istanbul ignore if*/
                if (err) {
                  return handleError(err, options, next);
                }
                // if the change request was created on create operation ,
                // currentInstance will be null which is fine
                fetchTheChangeRequest({
                  where: {
                    and: [{
                      modelName: modelName
                    }, {
                      modelId: modelId
                    }, {
                      status: 'pending'
                    }]
                  }
                }, options, function fetchChangeModel(err, inst) {
                  /* istanbul ignore if*/
                  if (err) {
                    return handleError(err, options, next);
                  }
                  var instObj = inst.toObject();
                  var operation = instObj.operation;
                  /* For second-maker currentInstance should have partially changed data from change-request */
                  // currentInstance = new Model(instObj.data);

                  /* For update, the currentInstance should not be null */
                  if (operation === 'update' && !currentInstance) {
                    let msg = 'Record with id:' + modelId + ' not found.';
                    let error = new Error(msg);
                    error.statusCode = error.status = 404;
                    error.code = 'MODEL_NOT_FOUND';
                    return next(error);
                  }
                  
                  var instx = JSON.parse(JSON.stringify(instObj.data));
                  for (let key in updates) {
                    if (Object.prototype.hasOwnProperty.call(updates, key)) {
                      instx[key] = updates[key];
                    }
                  }

                  var modifiers = inst._modifiers || [];
                  modifiers.push(options.ctx.username);

                  /* data could be partial changes submitted by maker-2
                  So we should always apply data on currentInstance and send that for _makerValidation */
                  Model._makerValidate(Model, operation, instx, currentInstance, null, options, function _validateCb(err, _data) {
                    if (err) {
                      return handleError(err, options, next);
                    }
                    log.debug(options, 'Instance has been validated during maker checker creation');
                    _data._modifiedBy = options.ctx.username;
                    var changeRequestChanges = {
                      data: _data,
                      remarks: data.__comments__,
                      _modifiers: modifiers,
                      _version: inst._version
                    };
                    if (data.__verificationStatus__) {
                      changeRequestChanges.verificationStatus = data.__verificationStatus__;
                    }
                    inst.updateAttributes(changeRequestChanges, options, function updateCM(err, res) {
                      /* istanbul ignore if*/
                      if (err) {
                        return handleError(err, options, next);
                      }
                      // process._processVariables._modelInstance = instx;
                      var xdata = {};
                      xdata.pv = pdata.pv || {};
                      xdata.pv._modifiers = modifiers;
                      xdata.pv._modelInstance = _data;

                      xdata.msg = pdata.msg;
                      xdata.__comments__ = pdata.__comments__;
                      return self.complete_(options, xdata, processDef, next);
                    });
                  });
                });
              });
            } else if (taskObj.isChecker) {
              // do handling of finalize transaction first, only then complete the task
              // user task wont complete till finalize transaction is successful
              WorkflowManager = loopback.getModel('WorkflowManager', options);
              workflowInstanceId = process._processVariables._workflowInstanceId;

              if (!data.__action__) {
                let err = new Error('__action__ not provided. Checker enabled task requires this field.');
                err.statusCode = err.status = 422;
                err.code = 'ACTION_REQUIRED';
                log.error(options, err);
                return next(err);
              }

              let validActArr = ['approved', 'rejected'];
              if (self.stepVariables && self.stepVariables.__action__) {
                validActArr = validActArr.concat(self.stepVariables.__action__);
              }

              let isValid = (validActArr.indexOf(data.__action__) > -1);
              if (!isValid) {
                let err = new Error('Provided action is not valid. Possible valid actions : ' + JSON.stringify(validActArr));
                err.statusCode = err.status = 422;
                err.code = 'INVALID_ACTION';
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
              pdata.__comments__ = data.__comments__;
              pdata.pv.__action__ = data.__action__;

              fetchTheChangeRequest({
                where: {
                  'workflowInstanceId': workflowInstanceId
                }
              }, options, function fetchRM(err, request) {
                /* istanbul ignore if*/
                if (err) {
                  return handleError(err, options, next);
                }
                let updates = {
                  verificationStatus: data.__action__,
                  remarks: data.__comments__,
                  _version: request._version
                };
                populateVerifiedBy(loopback.getModel('ChangeWorkflowRequest', options), updates, options);
                request.updateAttributes(updates, options, function updateVerifiedByField(err, inst) {
                  /* istanbul ignore if*/
                  if (err) {
                    return handleError(err, options, next);
                  }
                  log.debug(options, 'updated verified by field in change request by checker');
                  return self.complete_(options, pdata, processDef, next);
                });
              });
            } else if (taskObj.isCheckerAutoFinalize) {
              // do handling of finalize transaction first, only then complete the task
              // user task wont complete till finalize transaction is successful
              WorkflowManager = loopback.getModel('WorkflowManager', options);
              workflowInstanceId = process._processVariables._workflowInstanceId;

              if (!data.__action__) {
                let err = new Error('__action__ not provided. Checker enabled task requires this field.');
                err.statusCode = err.status = 422;
                err.code = 'ACTION_REQUIRED';
                // log.error(options, err);
                return next(err);
              }

              let validActArr = ['approved', 'rejected'];
              if (self.stepVariables && self.stepVariables.__action__) {
                validActArr = validActArr.concat(self.stepVariables.__action__);
              }

              let isValid = (validActArr.indexOf(data.__action__) > -1);
              if (!isValid) {
                let err = new Error('Provided action is not valid. Possible valid actions : ' + JSON.stringify(validActArr));
                err.statusCode = err.status = 422;
                err.code = 'INVALID_ACTION';
                // log.error(options, err);
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
              pdata.__comments__ = data.__comments__;
              pdata.pv.__action__ = data.__action__;
              /* Set __comments__ for updating Remarks*/
              options.__comments__ = data.__comments__;
              if (['approved', 'rejected'].indexOf(data.__action__) > -1) {
                Object.keys(data).forEach((key) => {
                  if (!(key === 'pv' || key === 'msg' || key === '__action__' || key === '__comments__')) {
                    postData.updates = postData.updates || {};
                    postData.updates.set = postData.updates.set || {};
                    postData.updates.set[key] = data[key];
                  }
                });
                WorkflowManager.endAttachWfRequest(postData, options, function completeMakerCheckerRequest(err, res) {
                  delete options.__comments__;
                  if (err) {
                    return handleError(err, options, next);
                  }
                  return self.complete_(options, pdata, processDef, next);
                });
              } else {
                /* Update verificationStatus and Remarks on ChangeRequest and mark the task complete */
                fetchTheChangeRequest({
                  where: {
                    'workflowInstanceId': workflowInstanceId
                  }
                }, options, function fetchCR(err, request) {
                  /* istanbul ignore if*/
                  if (err) {
                    return handleError(err, options, next);
                  }
                  let updates = {
                    verificationStatus: data.__action__,
                    remarks: data.__comments__,
                    _version: request._version
                  };
                  populateVerifiedBy(loopback.getModel('ChangeWorkflowRequest', options), updates, options);
                  request.updateAttributes(updates, options, function updateVerifiedByField(err, inst) {
                    /* istanbul ignore if*/
                    if (err) {
                      return handleError(err, options, next);
                    }
                    return self.complete_(options, pdata, processDef, next);
                  });
                });
              }
            } else {
              return self.complete_(options, data, processDef, next);
            }
          });
        } catch (err) {
          return handleError(err, options, next);
        }
      });
    });
  };
  /**
   * REST endpoint for completing User-Task
   * @param  {Object}   options           Options
   * @param  {Object}   data              Process-Variables & Message data
   * @param  {Object}   pdef              Process-Definition
   * @param  {Function} next              Callback
   * @returns {void}
   */
  Task.prototype.complete_ = function complete_(options, data, pdef, next) {
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
      let error = new Error('Task already completed');
      error.code = 'TASK_ALREADY_COMPLETED';
      error.status = error.statusCode = 409;
      return next(error);
    }
    self.processInstance({}, options, function fetchPI(err, processInstance) {
      /* istanbul ignore if*/
      if (err) {
        return handleError(err, options, next);
      }
      var workflowCtx = processInstance._workflowCtx || options;
      processInstance._completeTask(workflowCtx, self, message, processVariables, pdef, taskCompleteCallback);

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
        var updates = {
          status: status,
          comments: data.__comments__,
          _version: self._version,
          message: self.message
        };
        self.updateAttributes(updates, options, function saveTask(saveError, instance) {
          if (err || saveError) {
            return handleError(err || saveError, options, next);
          }
          next(null, instance);
        });
      }
    });
  };


  /**
   * REST endpoint for assigning task to another user or role.
   * @param  {Object}   data              Process-Variables & Message data
   * @param  {Object}   options           Options
   * @param  {Function} next              Callback
   * @returns {void}
   */
  Task.prototype.delegate = function delegate(data, options, next) {
    var self = this;
    var updates = {
      'candidateUsers': [],
      'candidateRoles': [],
      'candidateGroups': [],
      'id': self.id,
      '_version': self._version
    };

    data = data || {};
    if (data.assignee) {
      if (Array.isArray(data.assignee)) {
        updates.candidateUsers = data.assignee;
      } else {
        updates.candidateUsers = [data.assignee];
      }
    }
    if (data.role) {
      if (Array.isArray(data.role)) {
        updates.candidateRoles = data.role;
      } else {
        updates.candidateRoles = [data.role];
      }
    }
    if (data.group) {
      if (Array.isArray(data.group)) {
        updates.candidateGroups = data.group;
      } else {
        updates.candidateGroups = [data.group];
      }
    } else {
      let error = new Error('Assignee/role/group is required to delegate task.');
      error.statusCode = error.status = 400;
      error.code = 'INVALID_DATA';
      return handleError(error, options, next);
    }

    if (self.status !== 'pending') {
      let error = new Error('Task already completed');
      error.code = 'TASK_ALREADY_COMPLETED';
      error.status = error.statusCode = 409;
      return next(error);
    }

    data.comments && (updates.comments = data.comments);
    self.updateAttributes(updates, options, function cb(err, inst) {
      /* istanbul ignore if*/
      if (err) {
        return handleError(err, options, next);
      }
      next(null, inst);
    });
  };

  /**
   * REST endpoint for updating user comments
   * @param  {objet}    data          user comments
   * @param  {Object}   options           Options
   * @param  {Function} next              Callback
   * @returns {void}
   */
  Task.prototype.updateComments = function comments(data, options, next) {
    if (this.status !== 'pending') {
      let error = new Error('Task already completed');
      error.code = 'TASK_ALREADY_COMPLETED';
      error.status = error.statusCode = 409;
      return next(error);
    }
    if (data && data.comments) {
      var updates = {
        _version: this._version,
        comments: data.comments
      };
    } else {
      let error = new Error('Comments are required');
      error.code = 'INVALID_DATA';
      error.status = error.statusCode = 400;
      return next(error);
    }

    this.updateAttributes(updates, options, function updateAttributesCbFn(err, data) {
      /* istanbul ignore if*/
      if (err) {
        next(err);
      } else {
        next(null, data);
      }
    });
  };

  /**
   * REST endpoint for updating followUpDate
   * @param  {objet}    data          followUpDate
   * @param  {Object}   options           Options
   * @param  {Function} next              Callback
   * @returns {void}
   */
  Task.prototype.updateFollowUpDate = function followUpDate(data, options, next) {
    if (this.status !== 'pending') {
      let error = new Error('Task already completed');
      error.code = 'TASK_ALREADY_COMPLETED';
      error.status = error.statusCode = 409;
      return next(error);
    }
    if (data && data.followUpDate) {
      let followUpDate = dateUtils.parseShorthand(data.followUpDate, 'DD-MM-YYYY');
      var updates = {
        _version: this._version,
        followUpDate
      };
    } else {
      var error = new Error('follow up date is required');
      error.code = 'INVALID_DATA';
      error.status = error.statusCode = 400;
      return next(error);
    }

    this.updateAttributes(updates, options, function updateAttributesCbFn(err, data) {
      if (err) {
        next(err);
      } else {
        next(null, data);
      }
    });
  };


  Task.remoteMethod('complete', {
    accessType: 'WRITE',
    accepts: [{
      arg: 'data',
      type: 'object',
      http: {
        source: 'body'
      },
      description: 'Task instance'
    }, {
      arg: 'options',
      type: 'object',
      http: 'optionsFromRequest'
    }],
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
    accepts: [{
      arg: 'data',
      type: 'object',
      http: {
        source: 'body'
      },
      description: 'Task instance'
    }, {
      arg: 'options',
      type: 'object',
      http: 'optionsFromRequest'
    }],
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

  Task.remoteMethod('updateComments', {
    accessType: 'WRITE',
    accepts: [{
      arg: 'data',
      type: 'object',
      required: true,
      description: 'Task instance',
      http: {
        source: 'body'
      }
    }, {
      arg: 'options',
      type: 'object',
      http: 'optionsFromRequest'
    }],
    description: 'Sends a request to update task comments',
    http: {
      verb: 'put',
      path: '/updateComments/'
    },
    isStatic: false,
    returns: {
      type: 'object',
      root: true
    }
  });

  Task.remoteMethod('filtered', {
    description: 'Find filtered active tasks applicable to current user',
    accessType: 'READ',
    accepts: [{
      arg: 'filter',
      type: 'object',
      description: 'Filter defining fields and include'
    }, {
      arg: 'options',
      type: 'object',
      http: 'optionsFromRequest'
    }],
    http: {
      verb: 'get',
      path: '/filtered'
    },
    returns: {
      arg: 'data',
      type: 'object',
      root: true
    }
  });

  Task.remoteMethod('updateFollowUpDate', {
    accessType: 'WRITE',
    accepts: {
      arg: 'data',
      type: 'object',
      required: true,
      description: 'Task instance',
      http: { source: 'body' }
    },
    description: 'Sends a request to update follow up dates',
    http: {
      verb: 'put',
      path: '/updateFollowUpDate/'
    },
    isStatic: false,
    returns: {
      type: 'object',
      root: true
    }
  });
};
