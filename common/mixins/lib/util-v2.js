/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

var exports = module.exports = {};
var loopback = require('loopback');
var logger = require('oe-logger');
var log = logger('oe-workflow-util');

exports.triggerWorkflow = function triggerWorkflow(engineType, variables, workflowBody, options, cb) {
  if (engineType === 'oe-workflow') {
    triggerOEWorkflow(variables, workflowBody, options, cb);
  } else {
    triggerActivitiWorkflow(variables, workflowBody, options, cb);
  }
};

function triggerOEWorkflow(variables, workflowBody, options, cb) {
  var WorkflowInstance = loopback.getModel('WorkflowInstance', options);

  if (!workflowBody.processVariables) {
    workflowBody.processVariables = {};
  }
  workflowBody.processVariables = jsonConcat(workflowBody.processVariables, variables);

  WorkflowInstance.create(workflowBody, options, function response(err, res) {
    if (err) {
      log.error(options, err);
      cb(err);
    } else {
      log.debug(options, 'OE Workflow started with response ', res);
      cb(null, res);
    }
  });
}

function triggerActivitiWorkflow(modelvariables, workflowBody, options, cb) {
  var ProcessInstance = loopback.getModel('Activiti_ProcessInstance', options);

  if (!workflowBody.variables) {
    workflowBody.variables = [];
  }

  workflowBody.variables = workflowBody.variables.concat(modelvariables);

  ProcessInstance.start(workflowBody, options, function response(err, res) {
    if (err) {
      log.error(options, err);
      log.error(options, res);
      // res containes the error message
      return cb(err);
    }
    log.debug(log.defaultContext(), 'Activiti Workflow started with response ', res);
    cb(null, res);
  });
}

function jsonConcat(o1, o2) {
  for (var key in o2) {
    if (Object.prototype.hasOwnProperty.call(o2, key)) {
      o1[key] = o2[key];
    }
  }
  return o1;
}

exports.prepareWorkflowVariables = function prepareWorkflowVariables(engineType, instance, Model) {
  if (engineType === 'oe-workflow') {
    return prepareOEWorkflowVariables(instance);
  }
  return prepareActivitiVariables(instance);
};

function prepareOEWorkflowVariables(instance) {
  // TODO : remove outer variables once ported to oeworkflow-engine
  var variables = instance.toObject();
  variables._modelInstance = instance.toObject();
  return variables;
}

function prepareActivitiVariables(instance) {
  var variables = [];
  var activitiObject;
  var key;

  // log.debug(log.defaultContext(), 'if the instance has json objects, they wont be send along due to activiti input restrictions')
  for (key in instance) {
    if (!instance.hasOwnProperty(key) && typeof instance[key] === 'string') {
      activitiObject = {};
      activitiObject.name = key;
      activitiObject.value = instance[key];
      activitiObject.type = typeof instance[key];
      variables.push(activitiObject);
    }
  }

  for (key in instance._delta) {
    if (Object.prototype.hasOwnProperty.call(instance._delta, key)) {
      if (typeof instance._delta[key] === 'string') {
        activitiObject = {};
        activitiObject.name = 'delta_' + key;
        activitiObject.value = instance._delta[key];
        activitiObject.type = typeof instance._delta[key];
        variables.push(activitiObject);
      }
    }
  }

  return variables;
}

exports.createWFRequest = function createWFRequest(engineType, modelName, modelInstanceId, processId, operation, options, cb) {
  if (engineType === 'oe-workflow') {
    let RequestModel = loopback.getModel('WorkflowRequest', options);
    _createWFRequest(RequestModel, modelName, modelInstanceId, processId, operation, options, cb);
  } else {
    let RequestModel = loopback.getModel('Activiti_WorkflowRequest', options);
    _createWFRequest(RequestModel, modelName, modelInstanceId, processId, operation, options, cb);
  }
};

function _createWFRequest(RequestModel, modelName, modelInstanceId, processId, operation, options, cb) {
  RequestModel.find({
    'where': {
      'and': [{
        'modelName': modelName
      }, {
        'modelInstanceId': modelInstanceId
      }]
    }
  }, options, function fetchExistingRequest(err, res) {
    if (err) {
      log.error(options, err);
      cb(err);
    }
    if (res.length === 0) {
      // no existing workflow request create a new one
      RequestModel.create({
        'modelName': modelName,
        'modelInstanceId': modelInstanceId,
        'processId': processId,
        'operation': operation
      }, options, function fetchWR(err, res) {
        if (err) {
          log.error(options, err);
          cb(err);
        } else {
          log.debug(options, 'Workflow request instance for OE Workflow successfully created');
          cb();
        }
      });
    } else if (res.length === 1) {
      // previous workflow request exists instead update this instance
      // TODO : sanity check for existing workflow instance not being in running state
      res[0].updateAttributes({
        'processId': processId,
        'operation': operation
      }, options, function fetchWR(err, res) {
        if (err) {
          log.error(options, err);
          cb(err);
        } else {
          log.debug(options, 'Workflow request instance for OE Workflow successfully created');
          cb();
        }
      });
    } else {
      // there can't be multiple request for same model
      let err = new Error('multiple workflow requests found while creating new workflow request');
      log.error(options, err);
      return cb(err);
    }
  });
}

exports.terminateWorkflow = function terminateWorkflow(engineType, processId, options, cb) {
  if (engineType === 'oe-workflow') {
    terminateOEWorkflow(processId, options, cb);
  } else {
    suspendActivitiWorkflow(processId, options, cb);
  }
};

function terminateOEWorkflow(processId, options, cb) {
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

function suspendActivitiWorkflow(processId, options, cb) {
  var ProcessInstance = loopback.getModel('Activiti_ProcessInstance', options);

  ProcessInstance.suspend(processId, options, function response(err, res) {
    if (err) {
      log.error(log.defaultContext(), err);
      cb(err);
    } else {
      log.debug(log.defaultContext(), 'Activiti Workflow suspended with response ', res);
      cb(null, res);
    }
  });
}
