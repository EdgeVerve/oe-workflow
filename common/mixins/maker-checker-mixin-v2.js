/**
 *
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
/**
 * Maker Checker Mixin
 * @author Mandeep Gill(mandeep6ill), Prem Sai(premsai-ch), Sampath Kilparthi(sampathkumar81293)
 */

var loopback = require('loopback');
var util = require('./lib/util-v2.js');
const uuidv4 = require('uuid/v4');
var logger = require('oe-logger');
var log = logger('maker-checker-mixin-v2');

module.exports = function MakerCheckerMixin(Model) {
  // Skip this mixin where ever not applicable.
  if (skipThisMixinIfNotApplicable(Model)) {
    return;
  }

  if (!Model.settings._workflowEnabled) {
    if (Model.settings._attachOnActiviti) {
      addActivitiRemoteMethods(Model);
      delete Model.settings._attachOnActiviti;
    } else {
      addOERemoteMethods(Model);
    }

    Model.settings._workflowEnabled = true;
  } else if (Model.settings._attachOnActiviti) {
    // as workflow is already enabled, remote methods are already enabled, we can safely remove the prop
    delete Model.settings._attachOnActiviti;
  }

  // to enable newly added REST Endpoints on fly
  Model.app.model(Model);
};

function skipThisMixinIfNotApplicable(Model) {
  if (Model.definition.name === 'BaseEntity') {
    log.debug(log.defaultContext(), 'skipping mixin for - ', Model.definition.name);
    return true;
  }
  return false;
}

function addOERemoteMethods(Model) {
  Model.remoteMethod('workflow', {
    description: 'Find workflow instance attached to the model instance by id.',
    accessType: 'READ',
    accepts: [{
      arg: 'id',
      type: 'string',
      http: {
        source: 'path'
      },
      description: 'Model id'
    }],
    http: {
      verb: 'get',
      path: '/:id/workflow'
    },
    returns: {
      arg: 'response',
      type: 'object',
      root: true
    }
  });

  Model.remoteMethod('createMC', {
    description: 'Maker should do create via this api',
    accessType: 'WRITE',
    accepts: [{
      arg: 'data',
      type: 'object',
      http: {
        source: 'body'
      },
      description: 'Model data to be posted'
    }],
    http: {
      verb: 'post',
      path: '/createMC'
    },
    returns: {
      arg: 'response',
      type: 'object',
      root: true
    }
  });

  Model.remoteMethod('deleteMC', {
    description: 'Maker should do create via this api',
    accessType: 'WRITE',
    accepts: [{
      arg: 'id',
      type: 'string',
      http: {
        source: 'path'
      },
      description: 'Model id'
    }, {
      arg: 'version',
      type: 'string',
      http: {
        source: 'path'
      },
      description: 'Model '
    }],
    http: {
      verb: 'delete',
      path: '/:id/:version/deleteMC'
    },
    returns: {
      arg: 'response',
      type: 'object',
      root: true
    }
  });

  Model.remoteMethod('updateMC', {
    description: 'Maker should do create via this api',
    accessType: 'WRITE',
    accepts: [{
      arg: 'id',
      type: 'string',
      http: {
        source: 'path'
      },
      description: 'Model id'
    }, {
      arg: 'data',
      type: 'object',
      http: {
        source: 'body'
      },
      description: 'Model data to be posted'
    }],
    http: {
      verb: 'put',
      path: '/:id/updateMC'
    },
    returns: {
      arg: 'response',
      type: 'object',
      root: true
    }
  });

  Model.remoteMethod('findMC', {
    description: 'Find the intermediate instance present in Change Request Model.',
    accessType: 'READ',
    accepts: [{
      arg: 'id',
      type: 'string',
      http: {
        source: 'path'
      },
      description: 'Model id'
    }],
    http: {
      verb: 'get',
      path: '/:id/findMC'
    },
    returns: {
      arg: 'response',
      type: 'object',
      root: true
    }
  });

  Model.remoteMethod('tasks', {
    description: 'Find task instances attached to the model instance by id.',
    accessType: 'READ',
    accepts: [{
      arg: 'id',
      type: 'string',
      http: {
        source: 'path'
      },
      description: 'Model id'
    }],
    http: {
      verb: 'get',
      path: '/:id/tasks'
    },
    returns: {
      arg: 'response',
      type: 'object',
      root: true
    }
  });

  Model.deleteMC = function deleteMC(id, version, options, next) {
    var app = Model.app;
    var modelName = Model.definition.name;
    var ChangeWorkflowRequest = app.models.ChangeWorkflowRequest;

    Model.findById(id, options, function fetchInstance(err, sinst) {
      if (err) {
        log.error(options, err);
        return next(err);
      }
      // is the instance to be passed also ? if the user just passes the updates ?
      let einst = sinst.toObject();
      if (typeof id === 'undefined') {
        let err = new Error('please provide id');
        log.error(options, err);
        return next(err);
      }
      if (typeof version === 'undefined') {
        let err = new Error('please provide version');
        log.error(options, err);
        return next(err);
      }

      var mData = {
        modelName: modelName,
        modelId: id,
        operation: 'delete',
        data: einst
      };

      var WorkflowMapping = loopback.getModel('WorkflowMapping', options);
      var WorkflowInstance = loopback.getModel('WorkflowInstance', options);

      WorkflowMapping.find({
        where: {
          'and': [
            { 'modelName': modelName },
            { 'engineType': 'oe-workflow' },
            { 'version': 'v2' },
            { 'operation': 'delete' }
          ]
        }
      }, options, function fetchWM(err, res) {
        if (err) {
          log.error(options, 'unable to find workflow mapping - before save attach create [OE Workflow]', err);
          next(err);
        } else if (res && res.length === 0) {
          // this case should never occur
          log.debug(options, 'no create mapping found');
          next();
        } else if (res.length === 1) {
          var mapping = res[0];

          let workflowBody = mapping.workflowBody;
          workflowBody.processVariables = workflowBody.processVariables || {};
          workflowBody.processVariables._modelInstance = mData.data;
          // this is to identify while executing Finalize Transaction to follow which implementation
          workflowBody.processVariables._maker_checker_impl = 'v2';
          WorkflowInstance.create(workflowBody, options, function triggerWorkflow(err, winst) {
            if (err) {
              log.error(options, err);
              return next(err);
            }
            mData.workflowInstanceId = winst.id;
            ChangeWorkflowRequest.create(mData, options, function createChangeModel(err, inst) {
              if (err) {
                log.error(options, err);
                return next(err);
              }
              log.debug(options, inst);
              // wrapping back data properly
              let cinst = inst.toObject();
              for (let i in cinst.data) {
                if (Object.prototype.hasOwnProperty.call(cinst.data, i)) {
                  cinst[i] = cinst.data[i];
                }
              }
              delete cinst.data;
              return next(null, cinst);
            });
          });
        } else {
          let err = new Error('Multiple workflows attached to same Model.');
          log.error(options, err);
          return next(err);
        }
      });
    });
  };

  Model.updateMC = function updateMC(id, data, options, next) {
    var app = Model.app;
    var modelName = Model.definition.name;
    var ChangeWorkflowRequest = app.models.ChangeWorkflowRequest;

    Model.findById(id, options, function fetchInstance(err, sinst) {
      if (err) {
        log.error(options, err);
        return next(err);
      }
      // is the instance to be passed also ? if the user just passes the updates ?
      let einst = sinst.toObject();
      if (typeof data._version === 'undefined' || data._version !== einst._version) {
        let err = new Error('model instance version undefined or mismatch');
        log.error(options, err);
        return next(err);
      }

      ChangeWorkflowRequest.find({
        where: {
          and: [{
            modelName: modelName
          }, {
            modelId: id
          }]
        }}, options, function checkExisitingRequest(err, crinsts) {
          if (err) {
            log.error(options, err);
            return next(err);
          }
          if (crinsts.length > 1) {
            let err = new Error('Multiple change requests found, pertaining to same model Instance');
            log.error(options, err);
            return next(err);
          }
          if (crinsts.length === 1) {
            // existing change request found, need to delete existing request and interrupt
            // but only if user has provided the existing change request id
            // so that we can verify he is aware he had previously made a update which is not
            // yet complete, this logic might change later
            var crinst = crinsts[0];
            if (typeof data._changeRequestId === 'undefined' || crinst.id.toString() !== data._changeRequestId.toString()) {
              let err = new Error('change request id is not provided or mismatch');
              log.error(options, err);
              return next(err);
            }
            // now its safe to remove previous change request and interrupt previous workflow
            // we are async ly terminating not holding the main request , might change
            util.terminateWorkflow('oe-workflow', crinst.workflowInstanceId, options, function onTerminationWorkflow(err, res) {
              if (err) {
                let err = new Error('Unable to interrupt workflow in update retrigger case');
                log.error(options, err);
                return;
              }
              // now can destroy old change request
              crinst.destroy(options, function onOldChangeRequestRemoval(err, res) {
                if (err) {
                  log.error(options, err);
                  return;
                }
                log.debug(options, 'Exising change request instance removed properly');
                return;
              });
            });
          }

          // retrigger handling done, moving forward
          let idName = Model.definition.idName();
          data[idName] = id;
          var mData = {
            modelName: modelName,
            modelId: id,
            operation: 'update',
            data: data
          };

      // check instance data is Valid
          let obj = new Model(data);
          obj.isValid(function validate(valid) {
            if (valid) {
              log.debug(options, 'Instance has been validated during maker checker creation');

              var WorkflowMapping = loopback.getModel('WorkflowMapping', options);
              var WorkflowInstance = loopback.getModel('WorkflowInstance', options);

              WorkflowMapping.find({
                where: {
                  'and': [
              { 'modelName': modelName },
              { 'engineType': 'oe-workflow' },
              { 'version': 'v2' },
              { 'operation': 'update' }
                  ]
                }
              }, options, function fetchWM(err, res) {
                if (err) {
                  log.error(options, 'unable to find workflow mapping - before save attach create [OE Workflow]', err);
                  next(err);
                } else if (res && res.length === 0) {
              // this case should never occur
                  log.debug(options, 'no create mapping found');
                  next();
                } else if (res.length === 1) {
                  var mapping = res[0];

                  let workflowBody = mapping.workflowBody;
                  workflowBody.processVariables = workflowBody.processVariables || {};
                  workflowBody.processVariables._modelInstance = mData.data;
              // this is to identify while executing Finalize Transaction to follow which implementation
                  workflowBody.processVariables._maker_checker_impl = 'v2';
                  WorkflowInstance.create(workflowBody, options, function triggerWorkflow(err, winst) {
                    if (err) {
                      log.error(options, err);
                      return next(err);
                    }
                    mData.workflowInstanceId = winst.id;
                    ChangeWorkflowRequest.create(mData, options, function createChangeModel(err, inst) {
                      if (err) {
                        log.error(options, err);
                        return next(err);
                      }
                      log.debug(options, inst);
                  // wrapping back data properly
                      let cinst = unwrapChangeRequest(inst);
                      return next(null, cinst);
                    });
                  });
                } else {
                  let err = new Error('Multiple workflows attached to same Model.');
                  log.error(options, err);
                  return next(err);
                }
              });
            } else {
        // obj.errors is return object so stringifying and returning back
              let err = new Error(JSON.stringify(obj.errors));
              log.error(options, err);
              return next(err);
            }
          }, options, data);
        });
    });
  };

  Model.createMC = function createMC(data, options, next) {
    var app = Model.app;
    var modelName = Model.definition.name;
    var ChangeWorkflowRequest = app.models.ChangeWorkflowRequest;

    let idName = Model.definition.idName();
    // case id is not defined
    if (typeof data[idName] === 'undefined') {
      data[idName] =  uuidv4();
    }

    let modelId = data[idName];
    var mData = {
      modelName: modelName,
      modelId: modelId,
      operation: 'create',
      data: data
    };

    // check instance data is Valid
    let obj = new Model(data);
    obj.isValid(function validate(valid) {
      if (valid) {
        log.debug(options, 'Instance has been validated during maker checker creation');

        var WorkflowMapping = loopback.getModel('WorkflowMapping', options);
        var WorkflowInstance = loopback.getModel('WorkflowInstance', options);

        WorkflowMapping.find({
          where: {
            'and': [
              { 'modelName': modelName },
              { 'engineType': 'oe-workflow' },
              { 'version': 'v2' },
              { 'operation': 'create' }
            ]
          }
        }, options, function fetchWM(err, res) {
          if (err) {
            log.error(options, 'unable to find workflow mapping - before save attach create [OE Workflow]', err);
            next(err);
          } else if (res && res.length === 0) {
            // this case should never occur
            log.debug(options, 'no create mapping found');
            next();
          } else if (res.length === 1) {
            var mapping = res[0];

            let workflowBody = mapping.workflowBody;
            workflowBody.processVariables = workflowBody.processVariables || {};
            workflowBody.processVariables._modelInstance = mData.data;
            // this is to identify while executing Finalize Transaction to follow which implementation
            workflowBody.processVariables._maker_checker_impl = 'v2';
            WorkflowInstance.create(workflowBody, options, function triggerWorkflow(err, winst) {
              if (err) {
                log.error(options, err);
                return next(err);
              }
              mData.workflowInstanceId = winst.id;
              ChangeWorkflowRequest.create(mData, options, function createChangeModel(err, inst) {
                if (err) {
                  log.error(options, err);
                  return next(err);
                }
                log.debug(options, inst);
                // wrapping back data properly
                let cinst = unwrapChangeRequest(inst);
                delete cinst.data;
                return next(null, cinst);
              });
            });
          } else {
            let err = new Error('Multiple workflows attached to same Model.');
            log.error(options, err);
            return next(err);
          }
        });
      } else {
        // obj.errors is return object so stringifying and returning back
        let err = new Error(JSON.stringify(obj.errors));
        log.error(options, err);
        return next(err);
      }
    }, options, data);
  };

  Model.findMC = function findMC(id, ctx, cb) {
    var app = Model.app;
    var modelName = Model.definition.name;
    var ChangeWorkflowRequest = app.models.ChangeWorkflowRequest;

    ChangeWorkflowRequest.find({
      where: {
        and: [{
          modelName: modelName
        }, {
          modelId: id
        }]
      }
    }, ctx, function fetchChangeModel(err, inst) {
      if (err) {
        log.error(ctx, err);
        return cb(err);
      }
      if (inst.length > 1) {
        let err = new Error('Multiple instances found with same id in Change Workflow Request');
        log.error(ctx, err);
        return cb(err);
      } else if (inst.length === 0) {
        // no instance found in change request model
        return cb(null, null);
      }
      // unwarap the object
      let cinst = unwrapChangeRequest(inst[0]);
      return cb(null, cinst);
    });
  };

  function unwrapChangeRequest(inst) {
    let cinst = {};
    let oinst = inst.toObject();
    for (let i in oinst.data) {
      if (Object.prototype.hasOwnProperty.call(oinst.data, i)) {
        cinst[i] = oinst.data[i];
      }
    }
    cinst._changeRequestId = oinst.id;
    cinst._changeRequestVersion = oinst._version;
    return cinst;
  }

  Model.workflow = function workflow(id, ctx, cb) {
    var app = Model.app;
    var modelName = Model.definition.name;
    var ChangeWorkflowRequest = app.models.ChangeWorkflowRequest;
    var WorkflowInstance = app.models.WorkflowInstance;

    if (!id) {
      var err = new Error('id is required to find attached Workflow Instance.');
      log.error(ctx.options, err);
      return cb(err);
    }

    var filter = {
      'where': {
        'and': [
            { 'modelName': modelName },
            { 'modelId': id }
        ]
      }
    };

    ChangeWorkflowRequest.find(filter, ctx, function fetchWR(err, instances) {
      if (err) {
        log.error(ctx.options, err);
        return cb(err);
      }

      if (instances.length === 0) {
        log.debug(ctx, 'No workflow instance attached to current Model Instance Id');
        return cb(null, null);
      } else if ( instances.length > 1) {
        let err = new Error('multiple workflow request found with same Model Instance Id');
        log.error(ctx, err);
        return cb(err);
      }

      var workflowRef = instances[0].workflowInstanceId;

      WorkflowInstance.find({
        'where': {
          'id': workflowRef
        },
        'include': {
          'relation': 'processes'
        }
      }, ctx, function fetchWI(err, res) {
        if (err) {
          log.error(ctx.options, err);
          return cb(err);
        }
        // filtered on id so will always be a single instance
        cb(null, res[0]);
      });
    });
  };

  Model.tasks = function tasks(id, ctx, cb) {
    var app = Model.app;
    var modelName = Model.definition.name;
    var WorkflowRequest = app.models.ChangeWorkflowRequest;
    var WorkflowInstance = app.models.WorkflowInstance;

    if (!id) {
      var err = new Error('id is required to find attached Workflow Instance.');
      log.error(ctx.options, err);
      return cb(err);
    }

    var filter = {
      'where': {
        'and': [
            { 'modelName': modelName },
            { 'modelId': id }
        ]
      }
    };

    WorkflowRequest.find(filter, ctx, function fetchWR(err, instances) {
      if (err) {
        log.error(ctx.options, err);
        return cb(err);
      } else if (instances.length > 1) {
        let err = new Error('multiple workflow request found with same Model Instance Id');
        log.error(ctx.options, err);
        return cb(err);
      }

      if (instances.length === 0) {
        log.debug(ctx.options, 'No workflow instance attached to current Model Instance Id');
        return cb(null, null);
      }

      var workflowRef = instances[0].workflowInstanceId;

      WorkflowInstance.findById(workflowRef, ctx, function fetchWI(err, workflowInstance) {
        if (err) {
          log.error(ctx.options, err);
          return cb(err);
        }

        workflowInstance.tasks({
        }, ctx, function fetchProcesses(err, tasks) {
          if (err) {
            log.error(ctx.options, err);
            return cb(err);
          }

          cb(null, tasks);
        });
      });
    });
  };

    // to refresh swagger json
  Model.app.emit('modelRemoted', Model.sharedClass);
}

function addActivitiRemoteMethods(Model) {
  Model.remoteMethod('workflow', {
    description: 'Find workflow instance attached to the model instance by id.',
    accessType: 'READ',
    accepts: [{
      arg: 'id',
      type: 'string',
      http: {
        source: 'path'
      },
      description: 'Model id'
    }],
    http: {
      verb: 'get',
      path: '/:id/workflow'
    },
    returns: {
      arg: 'response',
      type: 'object',
      root: true
    }
  });

  Model.workflow = function workflow(id, options, cb) {
    var app = Model.app;
    var modelName = Model.definition.name;
    var ActivitiWfRequest = app.models.Activiti_WorkflowRequest;

    if (!id) {
      var err = new Error('id is required to find attached Workflow Instance.');
      log.error(err);
      return cb(err);
    }

    var filter = {
      'where': {
        'and': [
            { 'modelName': modelName },
            { 'modelInstanceId': id }
        ]
      }
    };

    ActivitiWfRequest.find(filter, options, function fetchWR(err, instances) {
      if (err) {
        log.error(err);
        return cb(err);
      } else if (instances.length > 1) {
        var lenErr = new Error('Multiple workflow instances cant be activated for a Model Instance');
        log.error(lenErr);
        return cb(lenErr);
      }

      if (instances.length === 0) {
        log.debug('No workflow instance attached to current Model Instance Id');
        return cb(null, null);
      }

      var workflowRef = instances[0].processId;

      var ActivitiProcessInstance = loopback.getModel('Activiti_ProcessInstance', options);
      ActivitiProcessInstance.getById(workflowRef, options, function fetchPI(err, res) {
        if (err) {
          log.error(err);
          return cb(err);
        }
        cb(null, res);
      });
    });
  };

  // to refresh swagger json
  Model.app.emit('modelRemoted', Model.sharedClass);
}
