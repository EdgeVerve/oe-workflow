/**
 *
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
/**
 * Workflow mixin
 * @author Ramesh
 */

const loopback = require('loopback');
const util = require('../../lib/utils/workflow-utils.js');
const logger = require('oe-logger');
const log = logger('workflow-mixin');
const uuidv4 = require('uuid/v4');

module.exports = function WorkflowMixin(Model) {
  if (!Model.settings._workflowMixinEnabled) {
    addOERemoteMethods(Model);
    addRemoteHooks(Model);
    Model.settings._workflowMixinEnabled = true;
  }
};

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

  Model.workflow = function workflow(id, ctx, cb) {
    var app = Model.app;
    var WorkflowInstance = app.models.WorkflowInstance;

    if (!id) {
      return handleError(new Error('id is required to find attached Workflow Instance'), ctx.options, cb);
    }

    var filter = {
      'where': {
        'correlationId': id
      },
      'include': {
        'relation': 'processes'
      }
    };

    WorkflowInstance.find(filter, ctx, function fetchWI(err, res) {
      if (err) {
        return handleError(err, ctx.options, cb);
      }
      // filtered on id so will always be a single instance
      cb(null, res[0]);
    });
  };

  Model.tasks = function tasks(id, ctx, cb) {
    var app = Model.app;
    var WorkflowInstance = app.models.WorkflowInstance;

    if (!id) {
      return handleError(new Error('id is required to find attached tasks'), ctx.options, cb);
    }

    var filter = {
      'where': {
        'correlationId': id
      },
      'include': {
        'processes': ['tasks']
      }
    };

    WorkflowInstance.find(filter, ctx, function fetchWI(err, workflowInstance) {
      if (err) {
        return handleError(err, ctx.options, cb);
      }
      var tasks = [];
      workflowInstance.forEach(function populateTasks(wfInst) {
        tasks = tasks.concat(_normalizeToTasks(wfInst.processes()));
      });
      cb(null, tasks);
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

function addRemoteHooks(Model) {
  Model.afterRemote('**', function wfAfterRemoteCb(ctx, modelInstance, next) {
    let modelName = ctx.method.ctor.modelName;
    var options = ctx.req.callContext || {};

    var operation = '';
    var method = ctx.method.name;
    var operationList = {
      create: ['create'],
      update: ['upsert', 'updateAll', 'replaceById', 'replaceOrCreate', 'upsertWithWhere', 'patchOrCreate', 'patchAttributes'],
      delete: ['deleteById', 'deleteAll']
    };
    var filter = {
      modelName: modelName,
      version: 'v0'
    };

    if (operationList.create.indexOf(method) !== -1) {
      operation = 'create';
      filter.operation = { inq: ['save', 'create'] };
    } else if (operationList.update.indexOf(method) !== -1) {
      filter.operation = { inq: ['save', 'update'] };
      operation = 'update';
    } else if (operationList.delete.indexOf(method) !== -1) {
      operation = 'delete';
      filter.operation = operation;
    } else {
      operation = 'custom';
      filter.operation = operation;
      filter['remote.path'] = ctx.req.route && ctx.req.route.path;
    }

    let WorkflowMapping = loopback.getModel('WorkflowMapping', options);

    WorkflowMapping.find({ where: filter }, options, function fetchWM(err, res) {
      if (err) {
        return handleError(err, options, next);
      } else if (res && res.length === 0) {
        // this case should never occur
        log.debug(options, `no ${operation} mapping found`);
        next();
      } else if (res.length > 1) {
        return handleError(`multiple workflow found attached on ${operation}`, options, next);
      } else {
        var mapping = res[0];
        /* Fix due to Decision Table changing instance constructor to object */
        if (modelInstance.constructor.name === 'Object') {
          modelInstance.setAttribute = function setAttribute(key, value) {
            modelInstance[key] = value;
          };
        }
        var idName = ctx.method.ctor.definition.idName();
        let engineType = 'oe-workflow';
        var xOptions = JSON.parse(JSON.stringify(options));

        log.debug(options, 'workflow hook [OE Workflow] called. Model - [' + modelName + ']');
        var variables = prepareOEWorkflowVariables(modelInstance);

        if (operation === 'delete') {
          mapping.workflowBody.correlationId = (ctx.req.params && ctx.req.params.id) ? ctx.req.params.id : 'DELETED_RECORD_ID';
        } else if (operation === 'custom') {
          mapping.workflowBody.correlationId = modelInstance[idName] || uuidv4();
        } else {
          mapping.workflowBody.correlationId = modelInstance[idName];
        }

        util.triggerWorkflow(engineType, variables, mapping.workflowBody, xOptions, function triggerWorkflowCb(err, res) {
          if (err) {
            return handleError(err, options, next);
          }
          next();
        });
      }
    });
  });
}

function handleError(err, options, callback) {
  log.error(options, err);
  return callback(err);
}

function prepareOEWorkflowVariables(instance) {
  var variables;
  if (instance.toObject) {
    variables = instance.toObject();
    variables._modelInstance = instance.toObject();
  } else {
    variables = Object.assign({}, instance);
    variables._modelInstance = Object.assign({}, instance);
  }
  return variables;
}
