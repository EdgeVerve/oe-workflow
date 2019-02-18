/**
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
var util = require('../../lib/utils/workflow-utils.js');
const uuidv4 = require('uuid/v4');
var logger = require('oe-logger');
var log = logger('maker-checker-mixin');

module.exports = function MakerCheckerMixin(Model) {
  // Skip this mixin where ever not applicable.
  if (skipThisMixinIfNotApplicable(Model)) {
    return;
  }

  if (!Model.settings._workflowEnabled) {
    addProperties(Model);
    // to update table with new columns in postgres
    Model.updateId = uuidv4();
    if (Model.settings._attachOnActiviti) {
      addActivitiRemoteMethods(Model);
      delete Model.settings._attachOnActiviti;
    } else {
      addOERemoteMethods(Model);
    }

    addObservers(Model);
    // addBeforeRemotes(Model);

    Model.settings._workflowEnabled = true;
  } else if (Model.settings._attachOnActiviti) {
    // as workflow is already enabled, remote methods are already enabled, we can safely remove the prop
    delete Model.settings._attachOnActiviti;
  }

  // Do not call autoUpdate. Just mark model to be updated
  // Model.dataSource.autoupdate([Model.modelName]);
  Model.updateId = uuidv4();

  // to enable newly added REST Endpoints on fly
  Model.app.model(Model);
};

// function addBeforeRemotes(Model) {
//   Model.beforeRemote('create', function createBeforeRemote(ctx, model, next) {
//     if (ctx.req.method === 'POST' && ctx.req.body.skipWorkflow === true) {
//       ctx.req.callContext.ctx.skipWorkflow = true;
//     }
//     next();
//   });
// }

function skipThisMixinIfNotApplicable(Model) {
  if (Model.definition.name === 'BaseEntity') {
    log.debug(log.defaultContext(), 'skipping mixin for - ', Model.definition.name);
    return true;
  }
  return false;
}

function addProperties(Model) {
  Model.defineProperty('_status', {
    type: String,
    required: false,
    default: ''
  });

  Model.defineProperty('_transactionType', {
    type: String,
    required: false,
    default: ''
  });

  Model.defineProperty('_delta', {
    type: Object,
    required: false,
    default: {}
  });

  Model.definition.settings.hidden = Model.definition.settings.hidden || [];
  Model.definition.settings.hidden.push('_transactionType');
}

function addObservers(Model) {
  Model.observe('before save', beforeSaveCommonHook);
  Model.observe('after save', afterSaveCommonHook);
  Model.observe('after accesss', afterAccessHook);
  Model.observe('before delete', beforeDeleteHook);
  Model.observe('after delete', afterDeleteHook);
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
    },
    {
      arg: 'options',
      type: 'object',
      http: 'optionsFromRequest'
    }
    ],
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
    },
    {
      arg: 'options',
      type: 'object',
      http: 'optionsFromRequest'
    }
    ],
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

  Model.workflow = function workflow(id, ctx, cb) {
    var app = Model.app;
    var modelName = Model.definition.name;
    var WorkflowRequest = app.models.WorkflowRequest;
    var WorkflowInstance = app.models.WorkflowInstance;

    if (!id) {
      var err = new Error('id is required to find attached Workflow Instance');
      log.error(ctx.options, err.message);
      return cb(err);
    }

    var filter = {
      'where': {
        'and': [{
          'modelName': modelName
        },
        {
          'modelInstanceId': id
        }
        ]
      }
    };

    WorkflowRequest.find(filter, ctx, function fetchWR(err, instances) {
      if (err) {
        return handleError(err, ctx.options, cb);
      }

      if (instances.length === 0) {
        log.debug(ctx.options, 'No workflow instance attached to current Model Instance Id');
        return cb(null, null);
      } else if (instances.length > 1) {
        return handleError(new Error('multiple workflow request found with same Model Instance Id'), ctx.options, cb);
      }

      var workflowRef = instances[0].processId;

      WorkflowInstance.find({
        'where': {
          'id': workflowRef
        },
        'include': {
          'relation': 'processes'
        }
      }, ctx, function fetchWI(err, res) {
        if (err) {
          return handleError(err, ctx.options, cb);
        }
        // filtered on id so will always be a single instance
        cb(null, res[0]);
      });
    });
  };

  Model.tasks = function tasks(id, ctx, cb) {
    var app = Model.app;
    var modelName = Model.definition.name;
    var WorkflowRequest = app.models.WorkflowRequest;
    var WorkflowInstance = app.models.WorkflowInstance;

    if (!id) {
      return handleError(new Error('id is required to find attached tasks'), ctx.options, cb);
    }

    var filter = {
      'where': {
        'and': [{
          'modelName': modelName
        },
        {
          'modelInstanceId': id
        }
        ]
      }
    };

    WorkflowRequest.find(filter, ctx, function fetchWR(err, instances) {
      if (err) {
        return handleError(err, ctx.options, cb);
      } else if (instances.length > 1) {
        return handleError(new Error('multiple workflow request found with same Model Instance Id'), ctx.options, cb);
      }

      if (instances.length === 0) {
        log.debug(ctx.options, 'No workflow instance attached to current Model Instance Id');
        return cb(null, null);
      }

      var workflowRef = instances[0].processId;

      WorkflowInstance.findById(workflowRef, ctx, function fetchWI(err, workflowInstance) {
        if (err) {
          return handleError(err, ctx.options, cb);
        }

        workflowInstance.processes({
          'fields': {
            'workflowInstanceId': true,
            'id': true
          },
          'include': 'tasks'
        }, ctx, function fetchProcesses(err, processInstances) {
          if (err) {
            return handleError(err, ctx.options, cb);
          }

          cb(null, _normalizeToTasks(processInstances));
        });
      });
    });

    var _normalizeToTasks = function _normalizeToTasks(processInstances) {
      var tasks = [];

      for (var i = 0; i < processInstances.length; i++) {
        var pInstance = processInstances[i];
        var relatedTasks = pInstance.tasks() || [];

        for (var j = 0; j < relatedTasks.length; j++) {
          var task = relatedTasks[j];
          task.workflowInstanceId = pInstance.workflowInstanceId;
          tasks.push(task);
        }
      }

      return tasks;
    };
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
    },
    {
      arg: 'options',
      type: 'object',
      http: 'optionsFromRequest'
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
        'and': [{
          'modelName': modelName
        },
        {
          'modelInstanceId': id
        }
        ]
      }
    };

    ActivitiWfRequest.find(filter, options, function fetchWR(err, instances) {
      if (err) {
        return handleError(err, options, cb);
      } else if (instances.length > 1) {
        return handleError(new Error('Multiple workflow instances cant be activated for a Model Instance'), options, cb);
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

function afterAccessHook(ctx, next) {
  if (ctx && ctx.options && ctx.options._skip_wfx === true) {
    // instance to be read internally by workflow
    delete ctx.options._skip_wfx;
    return next();
  }

  if (ctx && ctx.options && ctx.options.fetchAllScopes === true) {
    // don't filter
    return next();
  }

  var instances = ctx.accdata;
  var resultData = [];
  var keys;
  var key;
  var j;
  var currUser = ctx.options.ctx.username;
  var currRoles = ctx.options.ctx.roles || [];
  var WorkflowMapping = ctx.Model.app.models.WorkflowMapping;

  WorkflowMapping.find({
    where: {
      modelName: ctx.Model.clientModelName
    }
  }, ctx.options, function fetchMapping(err, mappings) {
    if (err) {
      return handleError(err, ctx.options, next);
    }

    // other validations will make sure create particular workflow mapping is not attached twice on the same operation
    var createMap = mappings.filter(function filter(mapping) {
      return mapping.operation === 'create';
    })[0] || null;
    var updateMap = mappings.filter(function filter(mapping) {
      return mapping.operation === 'update';
    })[0] || null;
    // in case of delete transaction it doesnt make sense to give privileged Users, Roles who should not see the instance
    // var deleteMap = mappings.filter( function filter(mapping) { return mapping.operation === 'delete'; })[0] || null;

    var privilegedUsers = {
      create: [],
      update: [],
      match: function matchUser(type, username) {
        if (this[type].indexOf(username) > -1) {
          return true;
        }
        return false;
      }
    };

    var privilegedRoles = {
      create: [],
      update: [],
      match: function matchRole(type, roles) {
        var _roles = this[type];
        for (var i = 0; i < _roles.length; i++) {
          var _role = _roles[i];
          if (roles.indexOf(_role) > -1) {
            return true;
          }
        }
        return false;
      }
    };

    if (createMap) {
      if (createMap.privilegedUsers) {
        privilegedUsers.create = createMap.privilegedUsers;
      }
      if (createMap.privilegedRoles) {
        privilegedRoles.create = createMap.privilegedRoles;
      }
    }

    if (updateMap) {
      if (updateMap.privilegedUsers) {
        privilegedUsers.update = updateMap.privilegedUsers;
      }
      if (updateMap.privilegedRoles) {
        privilegedRoles.update = updateMap.privilegedRoles;
      }
    }

    for (var i = 0; i < instances.length; i++) {
      var instance = instances[i];

      if (!instance.hasOwnProperty('_status') || instance._status === null || typeof instance._status === 'undefined' || instance._status === '') {
        // _status prop is not present in instance, let it pass
        resultData.push(instance);
      } else if (instance._status === 'public') {
        // _status is public, so should be visible to everyone
        if (instance._transactionType) {
          delete instance._transactionType;
        }
        resultData.push(instance);
      } else if (instance._status === 'private' && instance._transactionType === 'save') {
        // intermediate create phase
        keys = Object.keys(instance._delta);
        // Assumption that _delta will not have any data in case of create and update always contains some data in _delta
        if (instance._createdBy === currUser && keys.length === 0) {
          resultData.push(instance);
        } else if (instance._createdBy !== currUser && keys.length !== 0) {
          for (j = 0; j < keys.length; j++) {
            key = keys[j];
            instance[key] = instance._delta[key];
          }
          delete instance._delta;
          resultData.push(instance);
        } else if (instance._createdBy === currUser && keys.length !== 0) {
          resultData.push(instance);
        }
      } else if (instance._status === 'private' && instance._transactionType === 'create' && (instance._createdBy === currUser || privilegedUsers.match('create', currUser) || privilegedRoles.match('create', currRoles))) {
        // intermediate create phase
        resultData.push(instance);
      } else if (instance._status === 'private' && instance._transactionType === 'delete' && instance._modifiedBy !== currUser) {
        // intermediate delete phase
        resultData.push(instance);
      } else if (instance._status === 'private' && instance._transactionType === 'update' && (instance._modifiedBy === currUser || privilegedUsers.match('update', currUser) || privilegedRoles.match('update', currRoles))) {
        // intermediate update phase - for user who has made the update
        resultData.push(instance);
      } else if (instance._status === 'private' && instance._transactionType === 'update' && instance._modifiedBy !== currUser) {
        // intermediate update phase - for user who hasn't made the update
        keys = Object.keys(instance._delta);

        for (j = 0; j < keys.length; j++) {
          key = keys[j];
          instance[key] = instance._delta[key];
        }
        delete instance._delta;
        resultData.push(instance);
      }
    }

    ctx.accdata = resultData;
    next();
  });
}

function beforeSaveCommonHook(ctx, next) {
  var err;

  if (ctx.instance && ctx.options && ctx.options._skip_wf) {
    log.debug(ctx.options, 'beforeSaveWorkflowHook : skipping create');
    next();
    // } else if (ctx.instance && ctx.options && ctx.options.ctx && ctx.options.ctx.skipWorkflow) {
    //   log.debug(ctx.options, 'beforeSaveWorkflowHook : skipping create during migration');
    //   next();
  } else if (ctx.currentInstance && ctx.options && ctx.options._skip_wf) {
    log.debug(ctx.options, 'beforeSaveWorkflowHook : skipping update');
    next();
  } else if (ctx.instance && ctx.isNewInstance) {
    // for CREATE query
    log.debug(ctx.options, 'beforeSaveWorkflowHook : CREATE');
    beforeSaveCreateHook(ctx, next);
  } else if (ctx.currentInstance) {
    // for UPDATE query
    if (ctx.currentInstance._status === 'private' && ctx.currentInstance._transactionType !== 'update') {
      // ctx.currentInstance._transactionType !== "update" ==> to handle reupdate case
      err = new Error('Update not allowed while instance is in private state');
      err.code = 'ATTACH_WORKFLOW_BAD_REQUEST';
      err.statusCode = 403;
      err.retriable = false;
      log.error(ctx.options, err.message);
      return next(err);
    }

    if (ctx.currentInstance._status === 'private' && ctx.currentInstance._transactionType === 'update' && ctx.options.ctx && ctx.options.ctx.username && ctx.currentInstance._modifiedBy !== ctx.options.ctx.username) {
      err = new Error('Update not allowed by a different user in private state');
      err.code = 'ATTACH_WORKFLOW_BAD_REQUEST';
      err.statusCode = 403;
      err.retriable = false;
      return handleError(err, ctx.options, next);
    }

    log.debug(ctx.options, 'beforeSaveWorkflowHook : UDPATE');
    beforeSaveUpdateHook(ctx, next);
  } else {
    log.debug(ctx.options, 'beforeSaveWorkflowHook : neither UPDATE nor CREATE');
    next();
  }
}

function beforeSaveCreateHook(ctx, next) {
  // UNKNOWMN : When the operation affects multiple instances (e.g. PersistedModel.updateAll()) or performs a partial update of a subset of model properties (e.g. PersistedModel.prototype.updateAttributes()), the context provides a where filter used to find the affected records and plain data object containing the changes to be made.

  var modelName = ctx.Model.definition.name;
  log.debug(ctx.options, 'before save - attach on create [OE Workflow] called. Model - [' + modelName + ']');

  var WorkflowMapping = loopback.getModel('WorkflowMapping', options);
  var options = ctx.options;

  let filter = {
    modelName: modelName,
    operation: {
      inq: ['create', 'save']
    }
  };
  WorkflowMapping.find({
    where: filter
  }, options, function fetchWM(err, res) {
    if (err) {
      return handleError(err, options, next);
    } else if (res && res.length === 0) {
      // this case should never occur
      log.debug(options, 'no create mapping found');
      next();
    } else if (res.length > 1) {
      return handleError('multiple workflow found attached on create', options, next);
    } else {
      var mapping = res[0];

      /* Fix due to Decision Table changing instance constructor to object */
      if (ctx.instance.constructor.name === 'Object') {
        ctx.instance.setAttribute = function setAttribute(key, value) {
          ctx.instance[key] = value;
        };
      }

      if (mapping.wfDependent === false) {
        ctx.instance.setAttribute('_status', 'public');
      } else {
        ctx.instance.setAttribute('_status', 'private');
        ctx.instance.setAttribute('_transactionType', 'create');
      }

      let idName = ctx.Model.definition.idName();
      // case id is not defined
      if (typeof ctx.instance[idName] === 'undefined') {
        ctx.instance.setAttribute(idName, uuidv4());
      }
      let key = '__workflow_mn_' + modelName + '_mid_' + ctx.instance[idName];
      ctx.options[key] = {
        _workflowBody: mapping.workflowBody,
        _engineType: mapping.engineType,
        _transactionType: 'create'
      };
      next();
    }
  });
}

function beforeSaveUpdateHook(ctx, next) {
  var modelName = ctx.Model.definition.name;
  log.debug(ctx.options, 'before save - attach on update [OE Workflow] called. Model - [' + modelName + ']');

  var WorkflowMapping = loopback.getModel('WorkflowMapping', options);
  var options = ctx.options;

  var filter = {
    modelName: modelName,
    operation: {
      inq: ['update', 'save']
    }
  };
  WorkflowMapping.find({
    where: filter
  }, options, function fetchWM(err, res) {
    if (err) {
      return handleError(err, options, next);
    } else if (res.length === 0) {
      log.debug(options, 'no mapping found');
      next();
    } else if (res.length > 1) {
      return handleError('multiple workflow found attached on update', options, next);
    } else {
      var mapping = res[0];

      if (mapping.wfDependent === false) {
        ctx.data._status = 'public';
      } else {
        var delta = {};
        var currentInstance = ctx.currentInstance.toObject();
        var originalProps = Object.keys(currentInstance);
        var newProps = Object.keys(ctx.data);
        var blacklisted = [
          '_version',
          '_oldVersion',
          '_modifiedOn',
          '_modifiedBy',
          '_createdBy',
          '_createdOn',
          '_delta',
          '_status',
          '_transactionType'
        ];

        // keep track of old prop values which are updating now
        for (var i = 0; i < newProps.length; i++) {
          var prop = newProps[i];
          if (JSON.stringify(ctx.data[prop]) !== JSON.stringify(currentInstance[prop]) && blacklisted.indexOf(prop) === -1) {
            if (originalProps.indexOf(prop) === -1 || typeof currentInstance[prop] === 'undefined') {
              delta[prop] = null;
            } else {
              delta[prop] = currentInstance[prop];
            }
          }
        }

        // its better to move the props to _delta this way because we can have props as a part of update which are not a part of properties listed in the model definition
        if (currentInstance._status === 'private') {
          // in case it is retrigger dont update _delta because it already has the correct old state
        } else {
          ctx.data._delta = delta;
        }
        ctx.data._status = 'private';
        ctx.data._transactionType = 'update';
        ctx.data._transactionType = mapping.operation;
      }

      let idName = ctx.Model.definition.idName();
      // case id is not defined
      let key = '__workflow_mn_' + modelName + '_mid_' + ctx.currentInstance[idName];
      ctx.options[key] = {
        _workflowBody: mapping.workflowBody,
        _engineType: mapping.engineType,
        _transactionType: mapping.operation
      };
      next();
    }
  });
}

function handleReTrigger(mapping, options) {
  var RequestModel;
  if (mapping.engineType === 'oe-workflow') {
    RequestModel = loopback.getModel('WorkflowRequest', options);
  } else {
    RequestModel = loopback.getModel('Activiti_WorkflowRequest', options);
  }

  RequestModel.find({
    where: {
      'and': [{
        'modelName': mapping.modelName
      },
      {
        'operation': mapping.operation
      },
      {
        'modelInstanceId': mapping.modelInstanceId
      }
      ]
    }
  }, options, function fetchRequest(err, res) {
    if (err) {
      return log.error(options, err);
    }
    if (res.length === 0) {
      return log.debug(options, 'no previous workflow request for model [' + mapping.modelName + ']');
    } else if (res.length === 1) {
      // suspend or delete the previous process instance
      // and delete the previous request
      var instance = res[0];
      var engineType = mapping.engineType;

      util.terminateWorkflow(engineType, instance.processId, options, function deletePreviousRequest(err, res) {
        if (err) {
          return log.error(options, 'unable to suspend workflow with process id - ' + instance.processId);
        }
        log.debug(options, 'suspended workflow with processId - ' + instance.processId);
      });
    } else {
      return log.error(options, 'multiple previous requests not possible');
    }
  });
}

function afterSaveCommonHook(ctx, next) {
  var modelName = ctx.Model.definition.name;
  var idName = ctx.Model.definition.idName();
  var key = '__workflow_mn_' + modelName + '_mid_' + ctx.instance[idName];
  var options;
  var engineType;
  var variables;
  var workflowBody;
  var xOptions;

  log.debug(ctx.options, 'after save workflow hook [OE Workflow] called. Model - [' + modelName + ']');

  if (ctx.options._skip_wf) {
    // skip internal create
    log.debug(ctx.options, 'skipping workflow after save hook');
    delete ctx.options._skip_wf;
    next();
  } else if (ctx.instance && ctx.isNewInstance === false && ctx.options[key] && (ctx.options[key]._transactionType === 'update' || ctx.options[key]._transactionType === 'save') && ctx.options[key]._workflowBody) {
    log.debug(ctx.options, 'triggering workflow - during update');

    options = ctx.options;
    workflowBody = ctx.options[key]._workflowBody;
    engineType = ctx.options[key]._engineType;
    variables = util.prepareWorkflowVariables(engineType, ctx.instance, ctx.Model);
    xOptions = JSON.parse(JSON.stringify(options));
    delete xOptions.transaction;
    delete xOptions.skipIdempotent;
    delete xOptions[key];

    let transactionType = ctx.options[key]._transactionType;
    handleReTrigger({
      'modelInstanceId': ctx.instance.id,
      'engineType': engineType,
      'operation': transactionType,
      'modelName': ctx.instance._type
    }, options);
    util.triggerWorkflow(engineType, variables, workflowBody, xOptions, function triggerWorkflowCb(err, res) {
      if (err) {
        handleError(err, ctx.options, next);
      }
      // var operation = ctx.options[key]._transactionType;
      // if (operation === 'save') {
      //   operation = operation + '-update';
      // }
      var workflowRef = res.id;
      delete ctx.options[key];
      util.createWFRequest(engineType, modelName, ctx.instance.id, workflowRef, 'update', options, next);
    });
    // update request anyway wont require after save workflow hook
  } else if (ctx.instance && ctx.options[key] && (ctx.options[key]._transactionType === 'create' || ctx.options[key]._transactionType === 'save') && ctx.options[key]._workflowBody) {
    // trigger workflow & create a WF request only if workflow was triggered
    log.debug(ctx.options, 'triggering workflow - during create');
    options = ctx.options;
    workflowBody = ctx.options[key]._workflowBody;
    engineType = ctx.options[key]._engineType;
    variables = util.prepareWorkflowVariables(engineType, ctx.instance, ctx.Model);
    xOptions = JSON.parse(JSON.stringify(options));
    delete xOptions.transaction;
    delete xOptions.skipIdempotent;
    delete xOptions[key];

    util.triggerWorkflow(engineType, variables, workflowBody, xOptions, function triggerWorkflowCb(err, res) {
      if (err) {
        return handleError(err, options, next);
      }
      // var operation = ctx.options[key]._transactionType;
      // if (operation === 'save') {
      //   operation = operation + '-create';
      // }
      var workflowRef = res.id;
      delete ctx.options[key];
      util.createWFRequest(engineType, modelName, ctx.instance.id, workflowRef, 'create', options, next);
    });
  } else {
    log.debug(ctx.options, 'skipping workflow - during other scenario');
    next();
  }
}

function beforeDeleteHook(ctx, next) {
  var modelName = ctx.Model.definition.name;
  log.debug(ctx.options, 'before delete hook called. Model - [' + modelName + ']');
  if (ctx.options && ctx.options._skip_wf) {
    log.debug(ctx.options, 'before Delete WorkflowHook : skipping Delete');
    return next();
  }
  if ((ctx.currentInstance && ctx.currentInstance._status === 'private') || (ctx.instance && ctx.instance._status === 'private')) {
    log.debug(ctx.options, 'before Delete WorkflowHook : skipping Delete as instance in private state');
    var err = new Error();
    err.code = 'ATTACH_WORKFLOW_BAD_REQUEST';
    err.statusCode = 400;
    err.message = 'Delete not allowed while instance is in private state.';
    err.retriable = false;
    log.error(ctx.options, err.message);
    return next(err);
  }

  var model = loopback.getModel(modelName, ctx.options);
  var WorkflowMapping = loopback.getModel('WorkflowMapping', ctx.options);

  WorkflowMapping.find({
    where: {
      modelName: modelName,
      operation: 'delete'
    }
  }, ctx.options, function fetchWM(err, res) {
    if (err) {
      return handleError(err, ctx.options, next);
    } else if (res.length === 0) {
      // No Delete mapping
      log.debug(ctx.options, 'no mapping found - workflow before delete hook');
      return next();
    } else if (res.length === 1) {
      var mapping = res[0];

      let idField = model.definition.idName() || 'id';
      var id = ctx.where && ctx.where[idField] ? ctx.where[idField] : (ctx.instance ? ctx.instance[idField] : undefined);
      model.findById(id, ctx.options, function fetchMI(err, instance) {
        if (err) {
          log.error(ctx.options, 'unable to fetch record in before delete : ', err);
          return next(err);
        }

        ctx.hookState._workflowBody = mapping.workflowBody;
        ctx.hookState._transactionType = 'delete';
        ctx.hookState._engineType = mapping.engineType;
        ctx.hookState._variables = util.prepareWorkflowVariables(ctx.hookState._engineType, instance, ctx.Model);
        ctx.instance._transactionType = 'delete';

        if (mapping.wfDependent === false) {
          ctx.instance._status = 'public';
          ctx.instance._isDeleted = true;
        } else {
          ctx.instance._status = 'private';
          ctx.instance._isDeleted = false;
          delete ctx.instance.requestId;
        }
        return next();
      });
    } else {
      return handleError('multiple workflow found attached on delete', ctx.options, next);
    }
  });
}

function afterDeleteHook(ctx, next) {
  var modelName = ctx.Model.definition.name;
  log.debug(ctx.options, 'after delete hook called. Model - [' + modelName + ']');

  if (ctx.options && ctx.options._skip_wf) {
    log.debug(ctx.options, 'skipping workflow - during after delete');
    delete ctx.options._skip_wf;
    next();
  } else if (ctx.hookState && ctx.hookState._workflowBody) {
    log.debug(ctx.options, 'triggering workflow - during after delete');

    var variables = ctx.hookState._variables;
    var workflowBody = ctx.hookState._workflowBody;
    var engineType = ctx.hookState._engineType;
    var operation = ctx.hookState._transactionType;

    var xOptions = JSON.parse(JSON.stringify(ctx.options));
    delete xOptions.transaction;
    delete xOptions.skipIdempotent;
    delete xOptions._transactionType;
    delete xOptions._workflowBody;
    delete xOptions._engineType;

    util.triggerWorkflow(engineType, variables, workflowBody, xOptions, function triggerWorkflowCb(err, res) {
      if (err) {
        log.error(ctx.options, err);
        next(err);
      }
      var workflowRef = res.id;

      let idField = ctx.Model.definition.idName() || 'id';
      let instanceId = ctx.where && ctx.where[idField] ? ctx.where[idField] : (ctx.instance ? ctx.instance[idField] : undefined);

      util.createWFRequest(engineType, modelName, instanceId, workflowRef, operation, ctx.options, next);

      delete ctx.hookState._variables;
      delete ctx.hookState._workflowBody;
      delete ctx.hookState._engineType;
    });
  } else {
    log.debug(ctx.options, 'skipping workflow - during other scenario');
    next();
  }
}

function handleError(err, options, callback) {
  log.error(options, err);
  return callback(err);
}
