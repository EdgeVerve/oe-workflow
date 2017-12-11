/**
 *
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
/**
 * Maker Checker Mixin Version2
 * @author Mandeep Gill(mandeep6ill), Prem Sai(premsai-ch)
 */

var loopback = require('loopback');
const uuidv4 = require('uuid/v4');

var validationError = require('loopback-datasource-juggler/lib/validations.js').ValidationError;
var mergeQuery = require('loopback-datasource-juggler/lib/utils').mergeQuery;

var logger = require('oe-logger');
var log = logger('maker-checker-mixin-v2');

module.exports = function MakerCheckerMixin(Model) {
	// Skip this mixin where ever not applicable.
  if (skipThisMixinIfNotApplicable(Model)) {
    return;
  }

  if (!Model.settings._workflowEnabled) {
    addOERemoteMethods(Model);
    Model.settings._workflowEnabled = true;
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
      path: '/maker-checker/:id/workflow'
    },
    returns: {
      arg: 'response',
      type: 'object',
      root: true
    }
  });

  Model.remoteMethod('createX', {
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
      path: '/maker-checker'
    },
    returns: {
      arg: 'response',
      type: 'object',
      root: true
    }
  });

  Model.remoteMethod('deleteX', {
    description: 'Maker should do delete via this api',
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
      description: 'Model version'
    }],
    http: {
      verb: 'delete',
      path: '/maker-checker/:id/:version'
    },
    returns: {
      arg: 'response',
      type: 'object',
      root: true
    }
  });

  Model.remoteMethod('updateX', {
    description: 'Maker should do update via this api',
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
      path: '/maker-checker/:id'
    },
    returns: {
      arg: 'response',
      type: 'object',
      root: true
    }
  });

  Model.remoteMethod('findX', {
    description: 'Find all the intermediate instances present in Change Request Model.',
    accessType: 'READ',
    accepts: [],
    http: {
      verb: 'get',
      path: '/maker-checker'
    },
    returns: {
      arg: 'data',
      type: ['object'],
      root: true
    }
  });

  Model.remoteMethod('findByIdX', {
    description: 'Find the intermediate instance present in Change Request Model.',
    accessType: 'READ',
    accepts: [{
      arg: 'id',
      type: 'string',
      http: {
        source: 'path'
      },
      description: 'Model id',
      required: true
    }, {
      arg: 'filter',
      type: 'object',
      description: 'Filter defining fields and include'
    }],
    http: {
      verb: 'get',
      path: '/maker-checker/:id'
    },
    returns: {
      arg: 'data',
      type: 'object',
      root: true
    }
  });

  Model.remoteMethod('recall', {
    description: 'Recall the Maker-Checker Instance',
    accessType: 'WRITE',
    accepts: [{
      arg: 'id',
      type: 'string',
      http: {
        source: 'path'
      },
      description: 'Model id'
    }],
    http: {
      verb: 'delete',
      path: '/maker-checker/:id/recall'
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
      description: 'Model id',
      required: true
    }, {
      arg: 'filter',
      type: 'object',
      description: 'Filter defining fields and include'
    }],
    http: {
      verb: 'get',
      path: '/maker-checker/:id/tasks'
    },
    returns: {
      arg: 'response',
      type: 'object',
      root: true
    }
  });

  Model.deleteX = function deleteX(id, version, options, next) {
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
        data: einst,
        _modifiers: [
          options.ctx.username
        ]
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
          workflowBody.processVariables._operation = mData.operation;
          workflowBody.processVariables._modelInstance = mData.data;
          workflowBody.processVariables._modelInstance._type = modelName;
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

  Model.updateX = function updateX(id, data, options, next) {
    var app = Model.app;
    var modelName = Model.definition.name;
    var ChangeWorkflowRequest = app.models.ChangeWorkflowRequest;

    Model.findById(id, options, function fetchInstance(err, sinst) {
      if (err) {
        log.error(options, err);
        return next(err);
      }
      if (!err & !sinst) {
        let err = new Error('Model id is not valid.');
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
            status: 'pending'
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
            terminateWorkflow(crinst.workflowInstanceId, options, function onTerminationWorkflow(err, res) {
              if (err) {
                let err = new Error('Unable to interrupt workflow in update retrigger case');
                log.error(options, err);
                return;
              }
              return;
            });
          }

					// retrigger handling done, moving forward
          let idName = Model.definition.idName();
          data[idName] = id;
          var mData = {
            modelName: modelName,
            modelId: id,
            operation: 'update',
            data: data,
            _modifiers: [
              options.ctx.username
            ]
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
                  workflowBody.processVariables._operation = mData.operation;
                  workflowBody.processVariables._modelInstance = mData.data;
                  workflowBody.processVariables._modelInstance._type = modelName;
									// this is to identify while executing Finalize Transaction to follow which implementation
                  workflowBody.processVariables._maker_checker_impl = 'v2';
                  WorkflowInstance.create(workflowBody, options, function triggerWorkflow(err, winst) {
                    if (err) {
                      log.error(options, err);
                      return next(err);
                    }
                    mData.workflowInstanceId = winst.id;
										// TODO : make this check better
                    if (crinsts.length > 0) {
                      delete mData.data._changeRequestId;
                      crinst.updateAttributes(mData, options, function createChangeModel(err, inst) {
                        if (err) {
                          log.error(options, err);
                          return next(err);
                        }
                        log.debug(options, inst);
												// wrapping back data properly
                        let cinst = unwrapChangeRequest(inst);
                        return next(null, cinst);
                      });
                      return;
                    }
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
              let err = validationError(obj);
              log.error(options, err);
              return next(err);
            }
          }, options, data);
        });
    });
  };

  Model.createX = function createX(data, options, next) {
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
      data: data,
      _modifiers: [
        options.ctx.username
      ]
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
            workflowBody.processVariables._operation = mData.operation;
            workflowBody.processVariables._modelInstance = mData.data;
            workflowBody.processVariables._modelInstance._type = modelName;
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
        let err = validationError(obj);
        log.error(options, err);
        return next(err);
      }
    }, options, data);
  };

  Model.findX = function findX(ctx, cb) {
    var app = Model.app;
    var modelName = Model.definition.name;
    var ChangeWorkflowRequest = app.models.ChangeWorkflowRequest;

    ChangeWorkflowRequest.find({
      where: {
        and: [{
          status: 'pending'
        }, {
          modelName: modelName
        }]
      }
    }, ctx, function fetchChangeModel(err, insts) {
      if (err) {
        log.error(ctx, err);
        return cb(err);
      }
      let cinsts = insts.map(function unwrapAll(inst) {
        return unwrapChangeRequest(inst);
      });
      return cb(null, cinsts);
    });
  };

  Model.findByIdX = function findByIdX(id, filter, ctx, cb) {
    var app = Model.app;
    var modelName = Model.definition.name;
    var ChangeWorkflowRequest = app.models.ChangeWorkflowRequest;

    if (typeof ctx === 'function') {
      cb = ctx;
      ctx = filter;
      filter = {};
    }

    var userQuery = JSON.parse(JSON.stringify(filter));
    var baseQuery = {
      where: {
        and: [{
          modelName: modelName
        }, {
          status: 'pending'
        }, {
          modelId: id
        }]
      }
    };
    mergeQuery(userQuery, baseQuery);

    ChangeWorkflowRequest.find(userQuery, ctx, function fetchChangeModel(err, inst) {
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
        var Model = app.models[modelName];
        return Model.findById(id, filter, ctx, cb);
      }
			// unwarap the object
      let cinst = unwrapChangeRequest(inst[0]);
      return cb(null, cinst);
    });
  };

  function terminateWorkflow(processId, options, cb) {
    var WorkflowInstance = loopback.getModel('WorkflowInstance', options);

    WorkflowInstance.terminate(processId, options, function response(err, res) {
      if (err) {
        log.error(options, err);
        cb(err);
      } else {
        log.debug(options, 'OE Workflow suspended with response ', res);
        cb(null, res);
      }
    });
  }

  function unwrapChangeRequest(inst) {
    let cinst = {};
    let oinst = inst.toObject();
    for (let i in oinst.data) {
      if (Object.prototype.hasOwnProperty.call(oinst.data, i)) {
        cinst[i] = oinst.data[i];
      }
    }
    cinst._changeRequestId = oinst.id;
    return cinst;
  }

  Model.recall = function recall(id, options, cb) {
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
    }, options, function fetchChangeModel(err, inst) {
      if (err) {
        log.error(options, err);
        return cb(err);
      }
      if (inst.length > 1) {
        let err = new Error('Multiple instances found with same id in Change Workflow Request');
        log.error(options, err);
        return cb(err);
      } else if (inst.length === 0) {
				// no instance found in change request model
        return cb(null, null);
      }

      if (!options.ctx || !options.ctx.username) {
        let err = new Error('Unable to detect user making this request.');
        log.error(options, err);
        return cb(err);
      }
      let username = options.ctx.username;
      let modifiers = inst[0]._modifiers;

      if (modifiers.indexOf(username) === -1) {
        let err = new Error('Not authorized to recall');
        log.options(options, err);
        return cb(err);
      }

      var workflowInstanceId = inst[0].workflowInstanceId;
      inst[0].destroy(options, function deleteInstance(err, res) {
        if (err) {
          let err = new Error('Unable to delete change request in recall case');
          log.error(options, err);
          return cb(err);
        }
        terminateWorkflow(workflowInstanceId, options, function onTerminationWorkflow(err, res) {
          if (err) {
            let err = new Error('Unable to interrupt workflow in recall case');
            log.error(options, err);
            return cb(err);
          }
          return cb(null, {
            'success': true
          });
        });
      });
    });
  };

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
					{ 'status': 'pending' },
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

  Model.tasks = function tasks(id, tfilter, ctx, cb) {
    var app = Model.app;
    var modelName = Model.definition.name;
    var WorkflowRequest = app.models.ChangeWorkflowRequest;
    var WorkflowInstance = app.models.WorkflowInstance;

    if (typeof ctx === 'function') {
      cb = ctx;
      ctx = tfilter;
      tfilter = {};
    }

    var filter = {
      'where': {
        'and': [
					{ 'modelName': modelName },
					{ 'status': 'pending' },
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

        workflowInstance.tasks(tfilter, ctx, function fetchProcesses(err, tasks) {
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
