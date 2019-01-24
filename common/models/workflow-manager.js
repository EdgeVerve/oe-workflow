/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
/**
 * Attach Workflow and related utilities
 * @author Mandeep Gill(mandeep6ill), Prem Sai(premsai-ch), Sampath Kilparthi(sampathkumar81293)
 */

var logger = require('oe-logger');
var log = logger('WorkflowManager');
var async = require('async');
var mergeQuery = require('loopback-datasource-juggler/lib/utils').mergeQuery;
var applyMakerCheckerMixin = require('./../mixins/maker-checker-mixin');
var applyMakerCheckerMixinV2 = require('./../mixins/maker-checker-mixin-v2');

var loopback = require('loopback');
var helper = require('./../mixins/lib/maker-checker-helper.js');
var helperv2 = require('./../mixins/lib/maker-checker-helper-v2.js');

var baseWorkflowCallActivity = 'BaseWorkflowTemplate';
var relatedWorkflowCallActivity = 'RelatedWorkflowTemplate';


module.exports = function WorkflowManager(WorkflowManager) {
  WorkflowManager.disableRemoteMethod('create', true);
  WorkflowManager.disableRemoteMethod('upsert', true);
  WorkflowManager.disableRemoteMethod('updateAll', true);
  WorkflowManager.disableRemoteMethod('updateAttributes', false);
  WorkflowManager.disableRemoteMethod('find', true);
  WorkflowManager.disableRemoteMethod('findById', true);
  WorkflowManager.disableRemoteMethod('findOne', true);
  WorkflowManager.disableRemoteMethod('deleteById', true);
  WorkflowManager.disableRemoteMethod('deleteById', true);
  WorkflowManager.disableRemoteMethod('count', true);
  WorkflowManager.disableRemoteMethod('createChangeStream', true);
  WorkflowManager.disableRemoteMethod('exists', true);
  WorkflowManager.disableRemoteMethod('history', true);
  WorkflowManager.disableRemoteMethod('updateById', true);
  WorkflowManager.disableRemoteMethod('deleteWithVersion', true);

  WorkflowManager.attachWorkflow = function attachWorkflow(data, options, cb) {
    var app = WorkflowManager.app;
    var err;
    var relatedModelNames = [];
    var workflowBodyImplictPostRelated = {};
    var workflowBodyImplictPostBase = {};
    var relationModelNameMap = {};
    var relatedData = data.attachToRelatedModels;
    var relatedWorkflowBody = {};
    var privilegedUsers = [];
    var privilegedRoles = [];

    if (!data.operation) {
      err = new Error('operation parameter is required to attachWorkflow');
      log.error(options, err);
      return cb(err);
    } else if (!(data.operation === 'create' || data.operation === 'update' ||
      data.operation === 'delete' || data.operation === 'save' || data.operation === 'custom')) {
      err = new Error('operation is not valid');
      log.error(options, err);
      return cb(err);
    }

    if (data.operation === 'custom') {
      if (!data.remote || !data.remote.path || !data.remote.method || !data.remote.verb) {
        err = new Error('remote parameters (path,method,verb) are required for custom operation');
        err.code = 'INVALID_MAPPING_DATA';
        return cb(err);
      }
    }

    if (!data.modelName) {
      err = new Error('modelName parameter is required to attachWorkflow');
      log.error(options, err);
      return cb(err);
      // } else if (typeof app.models[data.modelName] === 'undefined') {
    } else if (typeof loopback.getModel(data.modelName, options) === 'undefined') {
      err = new Error('modelName is not valid');
      log.error(options, err);
      return cb(err);
    }
    // options {attachToRelatedModels: {}}
    if (typeof relatedData !== 'undefined') {
      [relatedModelNames, relationModelNameMap] = extractRelatedModelData(data.modelName);
    }

    if (!data.workflowBody || !data.workflowBody.workflowDefinitionName) {
      err = new Error('workflowBody parameter is required to attachWorkflow');
      log.error(options, err);
      return cb(err);
    }

    if (typeof relatedData !== 'undefined' && relatedData.implicitPost) {
      workflowBodyImplictPostBase.workflowDefinitionName = baseWorkflowCallActivity;
      workflowBodyImplictPostBase.processVariables = data.workflowBody.processVariables;
      [workflowBodyImplictPostRelated, relatedWorkflowBody] = createImplicitRelatedWorkflowBody(relatedData, data.workflowBody, relationModelNameMap);
    }
    if (typeof relatedData !== 'undefined' && !relatedData.implicitPost) {
      relatedWorkflowBody = createRelatedWorkflowBody(relatedData, relationModelNameMap);
    }
    if (typeof data.privilegedUsers !== 'undefined') {
      privilegedUsers = data.privilegedUsers;
    }

    if (typeof data.privilegedRoles !== 'undefined') {
      privilegedRoles = data.privilegedRoles;
    }

    function validateWorkflowDeployment(name, done) {
      var filter = { 'and': [{ 'name': name }, { 'latest': true }] };
      app.models.WorkflowDefinition.find({
        'where': filter
      }, options, function fetchWD(err, wfDefns) {
        if (err) {
          return done(err);
        } else if (wfDefns.length === 0) {
          return done(new Error('workflow definition not found'));
        } else if (wfDefns.length > 1) {
          return done(new Error('multiple workflow definitions found'));
        }
        done(null);
      });
    }

    var modelsToBeAttached = [data.modelName, ...relatedModelNames];
    var errorList = [];
    var mappingsList = [];
    async.eachOf(modelsToBeAttached, function createMappings(model, index, createMappingscb) {
      var modelName = model;
      var workflowBody = data.workflowBody;

      if (typeof relatedData !== 'undefined' && relatedData.implicitPost) {
        if (index === 0) {
          workflowBody = workflowBodyImplictPostBase;
        } else if (relatedData.attachSameWorkflow) {
          workflowBody = workflowBodyImplictPostRelated;
        } else if (relatedData.relatedModelWorkflowBody) {
          workflowBody = relatedWorkflowBody[model].workflowBody;
        }
      } else if (typeof relatedData !== 'undefined' && !relatedData.implicitPost) {
        if (index > 0) {
          if (relatedData.relatedModelWorkflowBody) {
            workflowBody = relatedWorkflowBody[model].workflowBody;
          }
        }
      }

      var operation = data.operation;
      var wfDependent = true;
      if (typeof data === 'object' && typeof data.wfDependent === 'boolean') {
        wfDependent = data.wfDependent;
      }

      var makersRecall = false;
      if (typeof data === 'object' && typeof data.makersRecall === 'boolean') {
        makersRecall = data.makersRecall;
      }

      var Model = loopback.getModel(modelName, options);
      var actualModelName = Model.modelName;

      var WorkflowMapping = app.models.WorkflowMapping;
      var instance = {
        'engineType': 'oe-workflow',
        'workflowBody': workflowBody,
        'modelName': modelName,
        'operation': operation,
        'wfDependent': wfDependent,
        'makersRecall': makersRecall,
        'actualModelName': actualModelName,
        'privilegedUsers': privilegedUsers,
        'privilegedRoles': privilegedRoles
      };
      // to make an entry in workflow mapping model for maker-checker v2
      if (data.version && data.version === 'v2') {
        instance.version = 'v2';
      }
      if (!workflowBody || typeof workflowBody === 'undefined' || (workflowBody && !workflowBody.workflowDefinitionName)) {
        createMappingscb();
      }
      validateWorkflowDeployment(workflowBody.workflowDefinitionName, function callback(err) {
        if (err) {
          log.error(options, err);
          return createMappingscb(err);
        }
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
        if (instance.operation === 'custom') {
          if (instance.version === 'v2') {
            filter.where.and.push({ 'mappingName': instance.mappingName });
          } else if (instance.version === 'v0') {
            filter.where.and.push({ 'remote.path': instance.remote.path });
            filter.where.and.push({ 'remote.verb': instance.remote.verb });
          }
        }
        WorkflowMapping.find(filter, options, function findWM(err, mapping) {
          if (err) {
            log.error(options, err);
            errorList.push(err);
            mappingsList.push(null);
            if (index === 0) {
              createMappingscb(err);
            }
          } else if (mapping.length === 0) {
            WorkflowMapping.create(instance, options, function createWM(err, mapping) {
              if (err) {
                log.error(options, err);
                errorList.push(err);
                mappingsList.push(null);
                if (index === 0) {
                  createMappingscb(err);
                }
                return createMappingscb();
              }
              if (mapping.version === 'v2') {
                applyMakerCheckerMixinV2(Model);
              } else if (mapping.version === 'v1') {
                applyMakerCheckerMixin(Model);
              } else {
                workflowMixin(Model);
              }
              log.debug(options, 'WorkflowMapping successfully created.');
              mappingsList.push(mapping);
              errorList.push(err);
              return createMappingscb();
            });
          } else {
            err = new Error('Workflow is already attached.');
            log.error(options, err);
            errorList.push(err);
            if (index === 0) {
              createMappingscb(err);
            } else {
              createMappingscb();
            }
          }
        });
      });
    }, function asynccb(err) {
      if (err) {
        log.error(options, err);
        return cb(err);
      }
      if (containsError(errorList)) {
        async.eachOf(mappingsList, function removeMappings(mapping, index, removeMappingscb) {
          if (mapping !== null && typeof mapping !== 'undefined') {
            var mappingId = mapping.id;
            var mappingVersion = mapping._version;
            detachWorkflowWithVersion(mappingId, mappingVersion, options, function detachcb(err, res) {
              if (err) {
                var detachError = new Error('Unable to rollback, detach workflow failed');
                return removeMappingscb(detachError);
              }
              return removeMappingscb();
            });
          }
        }, function asyncCallback(err) {
          if (err) {
            log.error(options, err);
            return cb(err);
          }
          var responsemessage = 'Unable to create workflow mapping; rolledback any partial mappings';
          // var attachmentErr = new WorkflowAttachmentError(responsemessage, mappingsList, errorList);
          var attachmentErr = new Error(responsemessage);
          attachmentErr.mappings = mappingsList;
          attachmentErr.attachmentErrors = errorList;
          return cb(attachmentErr);
        });
      } else {
        var response = { 'mappings': mappingsList };
        return cb(null, response);
      }
    });
  };

  WorkflowManager.detachWorkflowWithVersion = detachWorkflowWithVersion;

  WorkflowManager.endAttachWfRequest = endAttachWfRequest;

  WorkflowManager.viewAttachedWorkflows = viewAttachedWorkflows;

  function detachWorkflowWithVersion(id, version, options, cb) {
    var app = WorkflowManager.app;

    if (!id) {
      cb(new Error('id parameter is required to dettachWorkflow'));
      return;
    } else if (!version) {
      cb(new Error('version parameter is required to dettachWorkflow'));
      return;
    }

    app.models.WorkflowMapping.deleteWithVersion(id, version, options, function deleteWM(err, res) {
      if (err) {
        log.error(err);
        return cb(err);
      }
      cb(null, res);
    });
  }

  function viewAttachedWorkflows(filter, options, cb) {
    var app = WorkflowManager.app;
    var WorkflowMapping = app.models.WorkflowMapping;

    var baseQuery = {
      where: {
        'engineType': 'oe-workflow'
      }
    };

    if (filter) {
      mergeQuery(baseQuery, filter);
    }

    WorkflowMapping.find(baseQuery, options, function fetchWM(err, result) {
      if (err) {
        var errx = new Error('Unable to fetch WorkflowMapping.');
        log.error(options, errx);
        return cb(errx);
      }
      cb(null, result);
    });
  }

  function endAttachWfRequest(data, options, cb) {
    var app = WorkflowManager.app;
    var updates = null;
    if (data.updates) {
      updates = data.updates;
    }
    if (data.version && data.version === 'v2') {
      helperv2._endWorkflowRequest('oe-workflow', data.workflowInstanceId, data.status, updates, app, options, cb);
    } else {
      helper._endWorkflowRequest('oe-workflow', data.workflowInstanceId, data.status, updates, app, options, cb);
    }
  }

  function containsError(ErrorList) {
    for (var i = 0; i < ErrorList.length; i++) {
      if (ErrorList[i] !== null) {
        return true;
      }
    }
    return false;
  }

  function extractRelatedModelData(modelName) {
    var app = WorkflowManager.app;
    var relatedModelNames = [];
    var relationModelNameMap = {};
    var modelConstruct = app.models[modelName];
    if (modelConstruct && modelConstruct.settings && modelConstruct.settings.relations) {
      var relations = modelConstruct.settings.relations;
      for (var relation in relations) {
        if (Object.prototype.hasOwnProperty.call(relations, relation)) {
          relatedModelNames.push(relations[relation].model);
          relationModelNameMap[relation] = relations[relation].model;
        }
      }
    }
    return [relatedModelNames, relationModelNameMap];
  }

  function createImplicitRelatedWorkflowBody(relatedData, mainWorkflowBody, relationModelNameMap) {
    var processVariables = {};
    var relatedWorkflowBody = {};
    var innerWorkflowBody = {};
    var modelName;
    var workflowBodyImplictPostRelated = {};
    if (relatedData.attachSameWorkflow) {
      if (typeof mainWorkflowBody === 'undefined') {
        return [];
      }
      if (typeof mainWorkflowBody.processVariables !== 'undefined') {
        processVariables = mainWorkflowBody.processVariables;
      }
      processVariables.CallActivityWorkflow = mainWorkflowBody.workflowDefinitionName;
      workflowBodyImplictPostRelated.workflowDefinitionName = relatedWorkflowCallActivity;
      workflowBodyImplictPostRelated.processVariables = processVariables;
    } else if (typeof relatedData.relatedModelWorkflowBody !== 'undefined') {
      for (var relation in relationModelNameMap) {
        if (Object.prototype.hasOwnProperty.call(relationModelNameMap, relation)) {
          processVariables = {};
          innerWorkflowBody = {};
          modelName = relationModelNameMap[relation];
          if (typeof relatedData.relatedModelWorkflowBody[relation] !== 'undefined' &&
            typeof relatedData.relatedModelWorkflowBody[relation].workflowBody !== 'undefined') {
            processVariables.CallActivityWorkflow = relatedData.relatedModelWorkflowBody[relation].workflowBody.workflowDefinitionName;
            innerWorkflowBody.workflowDefinitionName = relatedWorkflowCallActivity;
            innerWorkflowBody.processVariables = processVariables;
            relatedWorkflowBody[modelName] = { 'workflowBody': innerWorkflowBody };
          }
        }
      }
    }
    return [workflowBodyImplictPostRelated, relatedWorkflowBody];
  }

  function createRelatedWorkflowBody(relatedData, relationModelNameMap) {
    var relatedWorkflowBody = {};
    var innerWorkflowBody = {};
    var modelName;
    if (!relatedData.attachSameWorkflow && relatedData.relatedModelWorkflowBody) {
      for (var relation in relationModelNameMap) {
        if (Object.prototype.hasOwnProperty.call(relationModelNameMap, relation)) {
          innerWorkflowBody = {};
          modelName = relationModelNameMap[relation];
          if (relatedData.relatedModelWorkflowBody[relation]) {
            innerWorkflowBody.workflowDefinitionName = relatedData.relatedModelWorkflowBody[relation].workflowBody.workflowDefinitionName;
            innerWorkflowBody.processVariables = relatedData.relatedModelWorkflowBody[relation].workflowBody.processVariables;
            relatedWorkflowBody[modelName] = { 'workflowBody': innerWorkflowBody };
          }
        }
      }
    }
    return relatedWorkflowBody;
  }


  WorkflowManager.remoteMethod('endAttachWfRequest', {
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

  WorkflowManager.remoteMethod('viewAttachedWorkflows', {
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

  WorkflowManager.remoteMethod('attachWorkflow', {
    description: 'Attach OE Workflow to a Model',
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

  WorkflowManager.remoteMethod('detachWorkflowWithVersion', {
    http: {
      path: '/workflows/:id/:version',
      verb: 'delete'
    },
    description: 'Detach OE workflow from a Model.',
    accepts: [{
      arg: 'id',
      type: 'string',
      required: true,
      http: {
        source: 'path'
      }
    }, {
      arg: 'version',
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
