/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

var logger = require('oe-logger');
var log = logger('ActivitiManager');

var helper = require('./lib/helper.js');
var mergeQuery = require('loopback-datasource-juggler/lib/utils').mergeQuery;
var applyMakerCheckerMixin = require('./../mixins/maker-checker-mixin');
var mcHelper = require('./../mixins/lib/maker-checker-helper.js');
var loopback = require('loopback');

module.exports = function ActivitiManager(ActivitiManager) {
  ActivitiManager.disableRemoteMethod('create', true);
  ActivitiManager.disableRemoteMethod('upsert', true);
  ActivitiManager.disableRemoteMethod('updateAll', true);
  ActivitiManager.disableRemoteMethod('updateAttributes', false);
  ActivitiManager.disableRemoteMethod('find', true);
  ActivitiManager.disableRemoteMethod('findById', true);
  ActivitiManager.disableRemoteMethod('findOne', true);
  ActivitiManager.disableRemoteMethod('deleteById', true);
  ActivitiManager.disableRemoteMethod('deleteById', true);
  ActivitiManager.disableRemoteMethod('count', true);
  ActivitiManager.disableRemoteMethod('createChangeStream', true);
  ActivitiManager.disableRemoteMethod('exists', true);
  ActivitiManager.disableRemoteMethod('history', true);
  ActivitiManager.disableRemoteMethod('updateById', true);
  ActivitiManager.disableRemoteMethod('deleteWithVersion', true);


  ActivitiManager.enable = function enable(baseUrl, options, cb) {
    var app = ActivitiManager.app;
    helper._enableActiviti(baseUrl, app, options, cb);
  };

  ActivitiManager.attachWorkflow = function attachWorkflow(data, options, cb) {
    var app = ActivitiManager.app;

    if (!data.operation) {
      cb(new Error('operation parameter is required to attachWorkflow'));
      return;
    } else if (!data.modelName) {
      cb(new Error('modelName parameter is required to attachWorkflow'));
      return;
    } else if (!data.workflowBody) {
      cb(new Error('workflowBody parameter is required to attachWorkflow'));
      return;
    }

    var modelName = data.modelName;
    var workflowBody = data.workflowBody;
    var operation = data.operation;
    var wfDependent = data.wfDependent;
    var Model = loopback.getModel(modelName, options);
    var actualModelName = Model.modelName;

    var WorkflowMapping = app.models.WorkflowMapping;
    var instance = {
      'engineType': 'activiti',
      'workflowBody': workflowBody,
      'modelName': modelName,
      'operation': operation,
      'wfDependent': wfDependent,
      'actualModelName': actualModelName
    };

    var filter = {
      where: {
        and: [{
          engineType: instance.engineType
        }, {
          actualModelName: instance.actualModelName
        }, {
          operation: instance.operation
        }]
      }
    };

    WorkflowMapping.findOrCreate(filter, instance, options, function fetchOrCreateWM(err, mapping) {
      if (err) {
        log.error(options, err);
        return cb(err);
      }

      Model.settings._attachOnActiviti = true;
      applyMakerCheckerMixin(Model);
      log.debug(options, 'WorkflowMapping successfully created.');
      cb(null, mapping);
    });
  };


  ActivitiManager.detachWorkflow = function detachWorkflow(id, options, cb) {
    var app = ActivitiManager.app;

    if (!id) {
      var err = new Error('id is required to dettachWorkflow.');
      log.error(err);
      return cb(err);
    }

    app.models.WorkflowMapping.findById(id, options, function fetchWM(err, instance) {
      if (err) {
        log.error(err);
        return cb(err);
      }
      instance.destroy(options, function deleteWM(err, res) {
        if (err) {
          err = new Error('Unable to dettach Workflow.');
          log.error(err);
          return cb(err);
        }
        cb(null, res);
      });
    });
  };

  ActivitiManager.viewAttachedWorkflows = function viewAttachedWorkflows(filter, options, cb) {
    var app = ActivitiManager.app;
    var baseQuery = {
      where: {
        'engineType': 'activiti'
      }
    };

    if (filter) {
      mergeQuery(baseQuery, filter);
    }

    app.models.WorkflowMapping.find(baseQuery, options, function fetchWM(err, result) {
      if (err) {
        err = new Error('Unable to fetch WorkflowMapping.');
        log.error(err);
        return cb(err);
      }
      cb(null, result);
    });
  };

  ActivitiManager.endAttachWfRequest = function endAttachWfRequest(data, options, cb) {
    var app = ActivitiManager.app;
    mcHelper._endWorkflowRequest('activiti', data.workflowInstanceId, data.status, null, app, options, cb);
  };

  ActivitiManager.remoteMethod('enable', {
    description: 'enable Activiti rest endpoints',
    accepts: {
      arg: 'baseUrl',
      description: 'Activiti server URL to connect',
      type: 'string'
    },
    returns: {
      type: 'object',
      root: true
    }
  });

  ActivitiManager.remoteMethod('endAttachWfRequest', {
    accepts: {
      arg: 'data',
      type: 'object',
      http: {
        source: 'body'
      },
      description: 'Request Instance data'
    },
    description: 'Conclude a workflow enabled transaction',
    returns: {
      type: 'object',
      root: true
    }
  });

  ActivitiManager.remoteMethod('viewAttachedWorkflows', {
    description: 'Fetch workflows those are already attached',
    accessType: 'READ',
    accepts: [{
      arg: 'filter',
      type: 'Object',
      description: 'Filter defining fields, where, include, order, offset, and limit',
      required: false
    }],
    http: {
      verb: 'GET',
      path: '/workflows'
    },
    returns: {
      type: 'object',
      root: true
    }
  });

  ActivitiManager.remoteMethod('attachWorkflow', {
    description: 'Attach Activiti Workflow to a Model',
    accessType: 'WRITE',
    accepts: {
      arg: 'data',
      type: 'object',
      http: {
        source: 'body'
      },
      description: 'Workflow Mapping instance data',
      default: {
        'modelName': 'string',
        'workflowBody': {},
        'operation': 'string',
        'wfDependent': 'boolean'
      }
    },
    http: {
      verb: 'POST',
      path: '/workflows'
    },
    returns: {
      type: 'object',
      root: true
    }
  });

  ActivitiManager.remoteMethod('detachWorkflow', {
    http: {
      path: '/workflows/:id',
      verb: 'delete'
    },
    description: 'Detach Activiti workflow from a Model.',
    accepts: [{
      arg: 'id',
      type: 'string',
      required: true,
      http: {
        source: 'path'
      }
    }],
    returns: {
      arg: 'response',
      type: 'object',
      root: true
    }
  });
};
