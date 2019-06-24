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
  var RequestModel;

  if (engineType === 'oe-workflow') {
    RequestModel = loopback.getModel('ChangeWorkflowRequest', options);
  } else {
    RequestModel = app.models.Activiti_WorkflowRequest;
  }

  if (typeof processId === 'object') {
    processId = processId.toString();
  }

  RequestModel.find({
    where: {
      'workflowInstanceId': processId
    }
  }, options, function fetchRM(err, requests) {
    if (err) {
      log.error(options, 'unable to find request to end', err);
      return next(err);
    }

    var errInvalidid;
    if (requests.length === 0) {
      errInvalidid = new Error('No corresponding workflow request found for concluding the Maker-Checker Process.');
      log.error(options, errInvalidid);
      return next(errInvalidid);
    }

    if (requests.length > 1) {
      errInvalidid = new Error('Multiple workflow requests found for concluding the Maker-Checker Process.');
      log.error(options, errInvalidid);
      return next(errInvalidid);
    }

    var request = requests[0];

    if (request.operation === 'create') {
      if (status === 'approved') {
        approvedCreateInstance(app, request, wfupdates, options, next);
      } else if (status === 'rejected') {
        rejectedCreateInstance(app, request, options, next);
      } else {
        next(new Error('invalid status passed during maker checker completition process'));
      }
    } else if (request.operation === 'update') {
      if (status === 'approved') {
        approvedUpdateInstance(app, request, wfupdates, options, next);
      } else if (status === 'rejected') {
        rejectedUpdateInstance(app, request, options, next);
      } else {
        next(new Error('invalid status passed during maker checker completition process'));
      }
    } else if (request.operation === 'delete') {
      if (status === 'approved') {
        approvedDeleteInstance(app, request, options, next);
      } else if (status === 'rejected') {
        rejectedDeleteInstance(app, request, options, next);
      } else {
        next(new Error('invalid status passed during maker checker completition process'));
      }
    } else if (request.operation === 'custom') {
      if (status === 'approved') {
        approvedCustomInstance(app, request, wfupdates, options, next);
      } else if (status === 'rejected') {
        rejectedCustomInstance(app, request, options, next);
      } else {
        next(new Error('invalid status passed during maker checker completition process'));
      }
    } else {
      err = new Error('invalid operation passed during maker checker completition process');
      log.error(options, err);
      return next(err);
    }
  });
};

function rejectedDeleteInstance(app, request, options, next) {
  var _verifiedBy = 'workflow-system';
  if (options.ctx && options.ctx.username) {
    _verifiedBy = options.ctx.username;
  }
  var updates = {
    status: 'complete',
    verificationStatus: 'rejected',
    remarks: options.__comments__ || '',
    _verifiedBy: _verifiedBy,
    _version: request._version
  };
  request.updateAttributes(updates, options, function cb(err, inst) {
    if (err) {
      log.error(options, err);
      return next(err);
    }
    log.debug(options, 'Workflow request completed for rejected create Maker Checker Request [' + request.modelName + ',' + request.modelId + ']');
    next(null, inst);
  });
}

function approvedDeleteInstance(app, request, options, next) {
  var model = loopback.getModel(request.modelName, options);

  model.deleteWithVersion(request.modelId, request.data._version, options, function fetchMI(err, instance) {
    if (err) {
      log.error(options, err);
      return next(err);
    }

    var _verifiedBy = 'workflow-system';
    if (options.ctx && options.ctx.username) {
      _verifiedBy = options.ctx.username;
    }
    var updates = {
      status: 'complete',
      verificationStatus: 'approved',
      remarks: options.__comments__ || '',
      _verifiedBy: _verifiedBy,
      _version: request._version
    };
    request.updateAttributes(updates, options, function cb(err, inst) {
      if (err) {
        log.error(options, 'error in updating instance status', err);
        return next(err);
      }
      log.debug(options, 'Workflow request completed for approved delete Maker Checker Request [' + request.modelName + ',' + request.modelId + ']');
      next(null, instance);
    });
  });
}

function rejectedUpdateInstance(app, request, options, next) {
  // TODO : create better error message so that user can understand why it failed
  var _verifiedBy = 'workflow-system';
  if (options.ctx && options.ctx.username) {
    _verifiedBy = options.ctx.username;
  }
  var updates = {
    status: 'complete',
    verificationStatus: 'rejected',
    remarks: options.__comments__ || '',
    _verifiedBy: _verifiedBy,
    _version: request._version
  };
  request.updateAttributes(updates, options, function cb(err, inst) {
    if (err) {
      log.error(options, err);
      return next(err);
    }
    log.debug(options, 'Workflow request completed for rejected create Maker Checker Request [' + request.modelName + ',' + request.modelId + ']');
    next(null, inst);
  });
}

function approvedUpdateInstance(app, request, wfupdates, options, next) {
  var model = loopback.getModel(request.modelName, options);

  model.findById(request.modelId, options, function fetchMI(err, instance) {
    if (err) {
      log.error(options, 'error in finding persisted instance', err);
      return next(err);
    }

    if (instance === null) {
      err = new Error('no instance found');
      log.error(options, err);
      return next(err);
    }

    let updates = request.data;
    if (wfupdates) {
      applyWorkflowUpdates(updates, wfupdates);
    }

    updates._verifiedBy = 'workflow-system';
    if (options.ctx && options.ctx.username) {
      updates._verifiedBy = options.ctx.username;
    }
    instance.updateAttributes(updates, options, function cb(err, inst) {
      if (err) {
        log.error(options, err);
        // if error occured during update revert to previous state
        // otherwise the instance will be stuck because of workflow
        return next(err);
      }
      var _verifiedBy = 'workflow-system';
      if (options.ctx && options.ctx.username) {
        _verifiedBy = options.ctx.username;
      }
      var updates = {
        status: 'complete',
        verificationStatus: 'approved',
        remarks: options.__comments__ || '',
        _verifiedBy: _verifiedBy,
        _version: request._version
      };
      request.updateAttributes(updates, options, function cb(err, dinst) {
        if (err) {
          log.error(options, err);
          return next(err);
        }
        log.debug(options, 'Workflow request completed for approved update Maker Checker Request [' + request.modelName + ',' + request.modelId + ']');
        return next(null, inst);
      });
    });
  });
}

function rejectedCreateInstance(app, request, options, next) {
  // TODO : create better error message so that user can understand why it failed
  var _verifiedBy = 'workflow-system';
  if (options.ctx && options.ctx.username) {
    _verifiedBy = options.ctx.username;
  }
  var updates = {
    status: 'complete',
    verificationStatus: 'rejected',
    remarks: options.__comments__ || '',
    _verifiedBy: _verifiedBy,
    _version: request._version
  };
  request.updateAttributes(updates, options, function cb(err, inst) {
    if (err) {
      log.error(options, err);
      return next(err);
    }
    log.debug(options, 'Workflow request completed for rejected create Maker Checker Request [' + request.modelName + ',' + request.modelId + ']');
    next(null, inst);
  });
}

function approvedCreateInstance(app, request, wfupdates, options, next) {
  var model = loopback.getModel(request.modelName, options);
  let data = request.data;
  var _verifiedBy;
  if (wfupdates) {
    applyWorkflowUpdates(data, wfupdates);
  }
  if (options.ctx && options.ctx.username) {
    _verifiedBy = options.ctx.username;
  }
  data._verifiedBy = _verifiedBy;
  model.create(data, options, function createTrueInstance(err, instance) {
    if (err) {
      log.error(options, err);
      return next(err);
    }
    _verifiedBy = 'workflow-system';
    if (options.ctx && options.ctx.username) {
      _verifiedBy = options.ctx.username;
    }
    var updates = {
      status: 'complete',
      verificationStatus: 'approved',
      remarks: options.__comments__ || '',
      _verifiedBy: _verifiedBy,
      _version: request._version
    };
    request.updateAttributes(updates, options, function cb(err, inst) {
      if (err) {
        log.error(options, err);
        return next(err);
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
  if (wfupdates) {
    applyWorkflowUpdates(data, wfupdates);
  }
  var args = data.map(function mapingOptionsCb(item) {
    if (item === 'options') {
      return options;
    }
    return item;
  });
  var customMethod = model[method];
  if (customMethod) {
    customMethod(...args, function cstMethodCb(err) {
      if (err) {
        return handleError(err, options, next);
      }
      var updates = {
        status: 'complete',
        verificationStatus: 'approved',
        remarks: options.__comments__ || '',
        _version: request._version
      };
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

function handleError(err, options, callback) {
  log.error(options, err);
  return callback(err);
}
