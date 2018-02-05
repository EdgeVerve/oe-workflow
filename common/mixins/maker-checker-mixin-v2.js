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
var async = require('async');
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

      var context = {
        Model: Model,
        id: id,
        options: options,
        instance: sinst,
        hookState: {},
        where: {}
      };

      Model.notifyObserversOf('before delete workflow', context, function beforeWorkflowCb(err) {
        if (err) {
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
            return next(err);
          } else if (res && res.length === 0) {
          // this case should never occur
            let err = new Error('no update maker checker mapping found');
            log.debug(options, err);
            return next(err);
          } else if (res.length === 1) {
            var mapping = res[0];

            let workflowBody = mapping.workflowBody;
            workflowBody.processVariables = workflowBody.processVariables || {};
            workflowBody.processVariables._operation = mData.operation;
            workflowBody.processVariables._modelInstance = mData.data;
            workflowBody.processVariables._modelInstance._type = modelName;
            workflowBody.processVariables._modelInstance._deletedBy = options.ctx.username;
            workflowBody.processVariables._modelInstance._modelId = id;
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
    });
  };

  Model.updateX = function updateX(id, data, options, next) {
    var app = Model.app;
    var modelName = Model.definition.name;
    var operation = 'update';
    var ChangeWorkflowRequest = app.models.ChangeWorkflowRequest;

    Model.findById(id, options, function fetchInstance(err, cinst) {
      if (err) {
        log.error(options, err);
        return next(err);
      }
      if (!err & !cinst) {
        let err = new Error('Model id is not valid.');
        log.error(options, err);
        return next(err);
      }
      // is the instance to be passed also ? if the user just passes the updates ?
      var currentInstance = cinst;
      let einst = cinst.toObject();
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

          options.isNewChangeRequest = true;
          Model._makerValidate(Model, operation, data, currentInstance, options, function _validateCb(err, _data) {
            if (err) {
              return next(err);
            }
            // retrigger handling done, moving forward
            var idName = Model.definition.idName();
            // TODO : check if this is even required
            _data[idName] = id;
            // reapply data over _data to regain related Model data, except the
            // data which has been generated via Validation
            for (let key in data) {
              if (Object.prototype.hasOwnProperty.call(data, key) && _data._usedFields.indexOf(key) < 0) {
                _data[key] = data[key];
              }
            }
            delete _data._usedFields;
            var mData = {
              modelName: modelName,
              modelId: id,
              operation: 'update',
              data: _data,
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
                      { 'operation': 'update' }
                ]
              }
            }, options, function fetchWM(err, res) {
              if (err) {
                log.error(options, 'unable to find workflow mapping - before save attach create [OE Workflow]', err);
                return next(err);
              } else if (res && res.length === 0) {
                // this case should never occur
                let err = new Error('no update maker checker mapping found');
                log.debug(options, err);
                return next(err);
              } else if (res.length === 1) {
                var mapping = res[0];

                let workflowBody = mapping.workflowBody;
                workflowBody.processVariables = workflowBody.processVariables || {};
                workflowBody.processVariables._operation = mData.operation;
                workflowBody.processVariables._modifiers = mData._modifiers;
                workflowBody.processVariables._modelInstance = mData.data;
                workflowBody.processVariables._modelInstance._type = modelName;
                workflowBody.processVariables._modelInstance._modifiedBy = options.ctx.username;
                workflowBody.processVariables._modelInstance._modelId = id;
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
          });
        });
    });
  };

  function makerValidation(Model, operation, data, currentInstance, options, next) {
    var obj = null;
    var context = {};
    // might need to a property like isNewChangeRequest to identify before
    // workflow is called as part of initial maker or not, could be useful
    if (operation === 'create') {
      obj = new Model(data);
      context = {
        Model: Model,
        instance: obj,
        isNewInstance: true,
        hookState: {},
        options: options
      };
    } else if (operation === 'update') {
      obj = currentInstance;
      context = {
        Model: Model,
        where: {},
        currentInstance: currentInstance,
        data: data,
        hookState: {},
        options: options
      };
      // update instance's properties
      try {
        obj.setAttributes(data);
      } catch (err) {
        return process.nextTick(function asyncErrorCb() {
          next(err);
        });
      }
    }

    if (options.isNewChangeRequest) {
      delete options.isNewChangeRequest;
      context.isNewChangeRequest = true;
    }
    Model.notifyObserversOf('before workflow', context, function beforeWorkflowCb(err) {
      if (err) {
        log.error(options, err);
        return next(err);
      }

      delete context.isNewChangeRequest;
      var RootModel = Model;
      var beforeSaveArray = Model._observers['before save'] || [];

      while (Model.base.modelName !== 'BaseEntity') {
        beforeSaveArray = beforeSaveArray.concat(Model.base._observers['before save'] || []);
        Model = Model.base;
      }
      Model = RootModel;

      var dpBeforeSave = beforeSaveArray.filter(function filterBeforeSave(beforeSave) {
        return beforeSave.name === 'dataPersonalizationBeforeSave';
      });
      if (dpBeforeSave.length !== 1) {
        let err = new Error('DataPersonalizationMixin fetch failed.');
        log.error(options, err);
        return next(err);
      }
      dpBeforeSave[0](context, function beforeSaveCb(err) {
        if (err) return next(err);

        // validation required
        obj.isValid(function validateCb(valid) {
          if (valid) {
            let data = obj.toObject(true);
            next(null, data);
          } else {
            let err = validationError(obj);
            log.error(options, err);
            return next(err);
          }
        }, context, data);
      });
    });
  }

  Model._makerValidate = function _makerValidate(Model, operation, data, currentInstance, options, next) {
    // get hasOne, hasMany relation metadata
    var relations = [];
    var _usedFields = [];
    var childData = {};
    var parentData = JSON.parse(JSON.stringify(data));
    for (let r in Model.relations) {
      if (Object.prototype.hasOwnProperty.call(Model.relations, r)) {
        let relation = Model.relations[r];
        childData = data[r];
        delete parentData[r];
        if (relation.type && relation.type === 'hasMany' && typeof data[r] !== 'undefined') {
          for (let i = 0; i < data[r].length; i++) {
            let _relObj = {
              Model: relation.modelTo,
              data: data[r][i],
              type: 'hasMany',
              relationName: r
            };
            relations.push(_relObj);
          }
        } else if (relation.type && relation.type === 'hasOne' && typeof data[r] !== 'undefined') {
          let _relObj = {
            Model: relation.modelTo,
            data: data[r],
            type: 'hasOne',
            relationName: r
          };
          relations.push(_relObj);
        }
      }
    }
    options.childData = childData;
    options.parentData = parentData;
    if (operation === 'create') {
      makerValidation(Model, operation, data, null, options, function _validateCb(err, _data) {
        if (err) {
          return next(err);
        }

        // pushing _data fields generated as part of MakerValidation to not get
        // overidden later
        for (var key in _data) {
          if (Object.prototype.hasOwnProperty.call(_data, key)) {
            _usedFields.push(key);
          }
        }
        async.map(relations,
        function validateEach(relation, cb) {
          let Model = relation.Model;
          let data = relation.data;
          makerValidation(Model, operation, data, null, options, cb);
        },
        function allDone(err, dataArray) {
          if (err) {
            return next(err);
          }
          for (let i = 0; i < relations.length; i++) {
            let relationName = relations[i].relationName;
            delete _data[relationName];
          }
          for (let i = 0; i < relations.length; i++) {
            let relationName = relations[i].relationName;
            if (relations[i].type === 'hasMany') {
              if (typeof _data[relationName] === 'undefined') {
                _usedFields.push(relationName);
                _data[relationName] = [];
              }
              _data[relationName].push(dataArray[i]);
            } else {
              _usedFields.push(relationName);
              _data[relationName] = dataArray[i];
            }
          }
          if (err) {
            return next(err);
          }
          _data._usedFields = _usedFields;
          delete options.childData;
          delete options.parentData;
          next(null, _data);
        });
      });
    } else if (operation === 'update') {
      makerValidation(Model, operation, data, currentInstance, options, function _validateCb(err, _data) {
        if (err) {
          return next(err);
        }

        // pushing _data fields generated as part of MakerValidation to not get
        // overidden later
        for (var key in _data) {
          if (Object.prototype.hasOwnProperty.call(_data, key)) {
            _usedFields.push(key);
          }
        }
        async.map(relations,
        function validateEach(relation, cb) {
          let Model = relation.Model;
          let data = relation.data;

          if (data.__row_status === 'deleted') {
            // no need to validate
            return process.nextTick(function safeCb() {
              cb(null, data);
            });
          } else if (data.__row_status === 'added') {
            // new related model instance data
            return makerValidation(Model, 'create', data, null, options, cb);
          } else if (data.__row_status === 'modified') {
            let idName = Model.definition.idName();
            let modelId = data[idName];
            Model.findById(modelId, options, function fetchCurrentInstance(err, currentInstance) {
              if (err) {
                log.error(options, err);
                return cb(err);
              }
              return makerValidation(Model, 'update', data, currentInstance, options, cb);
            });
          } else {
            // no need to validate, if row status is not given
            return process.nextTick(function safeCb() {
              cb(null, data);
            });
          }
        },
        function allDone(err, dataArray) {
          if (err) {
            return next(err);
          }
          for (let i = 0; i < relations.length; i++) {
            let relationName = relations[i].relationName;
            delete _data[relationName];
          }
          for (let i = 0; i < relations.length; i++) {
            let relationName = relations[i].relationName;
            if (relations[i].type === 'hasMany') {
              if (typeof _data[relationName] === 'undefined') {
                _usedFields.push(relationName);
                _data[relationName] = [];
              }
              let data = dataArray[i];
              data.__row_status = relations[i].data.__row_status;
              _data[relationName].push(data);
            } else {
              _usedFields.push(relationName);
              let data = dataArray[i];
              data.__row_status = relations[i].data.__row_status;
              _data[relationName] = data;
            }
          }
          if (err) {
            return next(err);
          }
          _data._usedFields = _usedFields;
          delete options.childData;
          delete options.parentData;
          next(null, _data);
        });
      });
    } else {
      process.nextTick(function asyncSafe() {
        let err = new Error('Validation not enabled for any operation except create and update.');
        return next(err);
      });
    }
  };

  Model.createX = function createX(data, options, next) {
    var app = Model.app;
    var modelName = Model.definition.name;
    var ChangeWorkflowRequest = app.models.ChangeWorkflowRequest;

    var idName = Model.definition.idName();
    var id = data[idName] || 'this_id_wont_exist';
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
        options.isNewChangeRequest = true;
        Model._makerValidate(Model, 'create', data, null, options, function _validateCb(err, _data) {
          if (err) {
            return next(err);
          }

          let idName = Model.definition.idName();
          // case id is not defined
          if (typeof _data[idName] === 'undefined') {
            _data[idName] =  uuidv4();
          }
          var id = _data[idName];
          // reapply data over _data to regain related Model data, except the
          // data which has been generated via Validation
          for (let key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key) && _data._usedFields.indexOf(key) < 0) {
              _data[key] = data[key];
            }
          }
          delete _data._usedFields;
          var mData = {
            modelName: modelName,
            modelId: id,
            operation: 'create',
            data: _data,
            _modifiers: [
              options.ctx.username
            ]
          };
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
              return next(err);
            } else if (res && res.length === 0) {
              // this case should never occur
              let err = new Error('no create maker checker mapping found');
              log.debug(options, err);
              return next(err);
            } else if (res.length === 1) {
              var mapping = res[0];

              let workflowBody = mapping.workflowBody;
              workflowBody.processVariables = workflowBody.processVariables || {};
              workflowBody.processVariables._operation = mData.operation;
              workflowBody.processVariables._modifiers = mData._modifiers;
              workflowBody.processVariables._modelInstance = mData.data;
              workflowBody.processVariables._modelInstance._type = modelName;
              workflowBody.processVariables._modelInstance._createdBy = options.ctx.username;
              workflowBody.processVariables._modelInstance._modelId = id;
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
        });
      });
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
        }, {
          status: 'pending'
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
        log.error(options, err);
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
