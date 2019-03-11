/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
/**
 * @mixin Maker Checker Utilities
 * @author Mandeep Gill(mandeep6ill), Prem Sai(premsai-ch)
 */

var logger = require('oe-logger');
var log = logger('maker-checker-end-request');

// var _ = require('lodash');
var loopback = require('loopback');

var exports = module.exports = {};

exports._endWorkflowRequest = function _endWorkflowRequest(engineType, processId, status, wfupdates, app, options, next) {
  if (status !== 'approved' && status !== 'rejected') {
    return next(new Error('invalid status passed during maker checker completition process'));
  }

  let RequestModel;
  if (engineType === 'oe-workflow') {
    RequestModel = loopback.getModel('ChangeWorkflowRequest', options);
  } else {
    RequestModel = app.models.Activiti_WorkflowRequest;
  }

  // if (typeof processId === 'object') {
  //   processId = processId.toString();
  // }

  RequestModel.find({
    where: {
      workflowInstanceId: processId
    }
  }, options, function fetchRM(err, requests) {
    /* istanbul ignore if*/
    if (err) {
      return handleError(err, options, next);
    }

    if (requests.length === 0) {
      return handleError(new Error('No corresponding workflow request found for concluding the Maker-Checker Process'), options, next);
    }

    if (requests.length > 1) {
      return handleError(new Error('Multiple workflow requests found for concluding the Maker-Checker Process.'), options, next);
    }

    var request = requests[0];

    if (request.operation === 'create') {
      if (status === 'approved') {
        approvedCreateInstance(app, request, wfupdates, options, next);
      } else {
        rejectedCreateInstance(app, request, options, next);
      }
    } else if (request.operation === 'update') {
      if (status === 'approved') {
        approvedUpdateInstance(app, request, wfupdates, options, next);
      } else {
        rejectedUpdateInstance(app, request, options, next);
      }
    } else if (request.operation === 'delete') {
      if (status === 'approved') {
        approvedDeleteInstance(app, request, options, next);
      } else {
        rejectedDeleteInstance(app, request, options, next);
      }
    } else if (request.operation === 'custom') {
      if (status === 'approved') {
        approvedCustomInstance(app, request, wfupdates, options, next);
      } else {
        rejectedCustomInstance(app, request, options, next);
      }
    } else {
      return handleError(new Error('invalid operation passed during maker checker completition process'), options, next);
    }
  });
};

function populateVerifiedBy(model, data, options) {
  if (model && model.getPropertyType('_verifiedBy') === 'String') {
    var _verifiedBy = 'workflow-system';
    if (options && options.ctx && options.ctx.username) {
      _verifiedBy = options.ctx.username;
    }
    data._verifiedBy = _verifiedBy;
  }
}

function rejectedDeleteInstance(app, request, options, next) {
  var updates = {
    status: 'complete',
    verificationStatus: 'rejected',
    remarks: options.__comments__ || '',
    _version: request._version
  };

  populateVerifiedBy(app.models.ChangeWorkflowRequest, updates, options);
  request.updateAttributes(updates, options, function cb(err, inst) {
    if (err) {
      return handleError(err, options, next);
    }
    log.debug(options, 'Workflow request completed for rejected create Maker Checker Request [' + request.modelName + ',' + request.modelId + ']');
    next(null, inst);
  });
}

function approvedDeleteInstance(app, request, options, next) {
  var model = loopback.getModel(request.modelName, options);

  model.deleteWithVersion(request.modelId, request.data._version, options, function fetchMI(err, instance) {
    if (err) {
      return handleError(err, options, next);
    }

    var updates = {
      status: 'complete',
      verificationStatus: 'approved',
      remarks: options.__comments__ || '',
      _version: request._version
    };
    populateVerifiedBy(app.models.ChangeWorkflowRequest, updates, options);
    request.updateAttributes(updates, options, function cb(err, inst) {
      if (err) {
        return handleError(err, options, next);
      }
      log.debug(options, 'Workflow request completed for approved delete Maker Checker Request [' + request.modelName + ',' + request.modelId + ']');
      next(null, instance);
    });
  });
}

function rejectedUpdateInstance(app, request, options, next) {
  // TODO : create better error message so that user can understand why it failed
  var updates = {
    status: 'complete',
    verificationStatus: 'rejected',
    remarks: options.__comments__ || '',
    _version: request._version
  };
  populateVerifiedBy(app.models.ChangeWorkflowRequest, updates, options);
  request.updateAttributes(updates, options, function cb(err, inst) {
    if (err) {
      return handleError(err, options, next);
    }
    log.debug(options, 'Workflow request completed for rejected create Maker Checker Request [' + request.modelName + ',' + request.modelId + ']');
    next(null, inst);
  });
}

function approvedUpdateInstance(app, request, wfupdates, options, next) {
  var model = loopback.getModel(request.modelName, options);

  model.findById(request.modelId, options, function fetchMI(err, instance) {
    /* istanbul ignore if*/
    if (err) {
      return handleError(err, options, next);
    }

    if (instance === null) {
      return handleError(new Error('no instance found'), options, next);
    }

    let updates = request.data;
    if (wfupdates) {
      applyWorkflowUpdates(updates, wfupdates);
    }

    populateVerifiedBy(model, updates, options);
    instance.updateAttributes(updates, options, function cb(err, inst) {
      if (err) {
        // if error occured during update revert to previous state
        // otherwise the instance will be stuck because of workflow
        return handleError(err, options, next);
      }
      var updates = {
        status: 'complete',
        verificationStatus: 'approved',
        remarks: options.__comments__ || '',
        _version: request._version
      };
      populateVerifiedBy(app.models.ChangeWorkflowRequest, updates, options);
      request.updateAttributes(updates, options, function cb(err, dinst) {
        if (err) {
          return handleError(err, options, next);
        }
        log.debug(options, 'Workflow request completed for approved update Maker Checker Request [' + request.modelName + ',' + request.modelId + ']');
        return next(null, inst);
      });
    });
  });
}

function rejectedCreateInstance(app, request, options, next) {
  // TODO : create better error message so that user can understand why it failed
  var updates = {
    status: 'complete',
    verificationStatus: 'rejected',
    remarks: options.__comments__ || '',
    _version: request._version
  };
  populateVerifiedBy(app.models.ChangeWorkflowRequest, updates, options);
  request.updateAttributes(updates, options, function cb(err, inst) {
    if (err) {
      return handleError(err, options, next);
    }
    log.debug(options, 'Workflow request completed for rejected create Maker Checker Request [' + request.modelName + ',' + request.modelId + ']');
    next(null, inst);
  });
}

function approvedCreateInstance(app, request, wfupdates, options, next) {
  var model = loopback.getModel(request.modelName, options);
  let data = request.data;
  if (wfupdates) {
    applyWorkflowUpdates(data, wfupdates);
  }
  populateVerifiedBy(model, data, options);
  model.create(data, options, function createTrueInstance(err, instance) {
    if (err) {
      return handleError(err, options, next);
    }
    var updates = {
      status: 'complete',
      verificationStatus: 'approved',
      remarks: options.__comments__ || '',
      _version: request._version
    };
    populateVerifiedBy(app.models.ChangeWorkflowRequest, updates, options);
    request.updateAttributes(updates, options, function cb(err, inst) {
      if (err) {
        return handleError(err, options, next);
      }
      log.debug(options, 'Workflow request completed for approved create Maker Checker Request [' + request.modelName + ',' + request.modelId + ']');
      next(null, instance);
    });
  });
}

function rejectedCustomInstance(app, request, options, next) {
  // TODO : create better error message so that user can understand why it failed
  var updates = {
    status: 'complete',
    verificationStatus: 'rejected',
    remarks: options.__comments__ || '',
    _version: request._version
  };
  populateVerifiedBy(app.models.ChangeWorkflowRequest, updates, options);
  request.updateAttributes(updates, options, function cb(err, inst) {
    if (err) {
      return handleError(err, options, next);
    }
    log.debug(options, 'Workflow request completed for rejected create Maker Checker Request [' + request.modelName + ',' + request.modelId + ']');
    next(null, inst);
  });
}

function approvedCustomInstance(app, request, wfupdates, options, next) {
  var model = loopback.getModel(request.modelName, options);
  let data = request.data;
  let method = data.pop();
  // if (wfupdates) {
  //   applyWorkflowUpdates(data, wfupdates);
  // }
  populateVerifiedBy(model, data, options);
  var args = data.map(function replaceOptions(item) {
    if (item === 'options') {
      return options;
    }
    return item;
  });
  var customMethod = model[method];
  if (customMethod) {
    customMethod(...args, function customRemoteCb(err) {
      if (err) {
        return handleError(err, options, next);
      }
      var updates = {
        status: 'complete',
        verificationStatus: 'approved',
        remarks: options.__comments__ || '',
        _version: request._version
      };
      populateVerifiedBy(app.models.ChangeWorkflowRequest, updates, options);
      request.updateAttributes(updates, options, function cb(err, inst) {
        if (err) {
          return handleError(err, options, next);
        }
        log.debug(options, 'Workflow request completed for approved create Maker Checker Request [' + request.modelName + ',' + request.modelId + ']');
        next();
      });
    });
  } else {
    return handleError('The custom method defined is not available on the model', options, next);
  }
}

function handleError(err, options, callback) {
  log.error(options, err);
  return callback(err);
}

function applyWorkflowUpdates(updates, wfupdates) {
  var key;

  for (key in wfupdates.set) {
    if (Object.prototype.hasOwnProperty.call(wfupdates.set, key)) {
      var val = wfupdates.set[key];
      updates[key] = val;
    }
  }

  for (key in wfupdates.unset) {
    if (Object.prototype.hasOwnProperty.call(wfupdates.unset, key)) {
      if (wfupdates.unset[key]) {
        updates[key] = null;
      }
    }
  }
}
