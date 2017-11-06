/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
/**
 * @mixin Maker Checker Utilities
 * @author Mandeep Gill(mandeep6ill), Prem Sai(premsai-ch), Sampath Kilparthi(sampathkumar81293)
 */

var logger = require('oe-logger');
var log = logger('maker-checker-end-request');

var _ = require('lodash');
var loopback = require('loopback');

var exports = module.exports = {};

exports._endWorkflowRequest = function _endWorkflowRequest(engineType, processId, status, wfupdates, app, options, next) {
  var RequestModel;

  if (engineType === 'oe-workflow') {
    RequestModel = app.models.WorkflowRequest;
  } else {
    RequestModel = app.models.Activiti_WorkflowRequest;
  }

  if (typeof processId === 'object') {
    processId = processId.toString();
  }

  RequestModel.find({
    where: {
      'processId': processId
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
        approvedCreateInstance(app, request.modelName, request.modelInstanceId, wfupdates, options, next);
      } else if (status === 'rejected') {
        rejectedCreateInstance(app, request.modelName, request.modelInstanceId, options, next);
      } else {
        next(new Error('invalid status passed during maker checker completition process'));
      }
    } else if (request.operation === 'update') {
      if (status === 'approved') {
        approvedUpdateInstance(app, request.modelName, request.modelInstanceId, wfupdates, options, next);
      } else if (status === 'rejected') {
        rejectedUpdateInstance(app, request.modelName, request.modelInstanceId, options, next);
      } else {
        next(new Error('invalid status passed during maker checker completition process'));
      }
    } else if (request.operation === 'delete') {
      if (status === 'approved') {
        approvedDeleteInstance(app, request.modelName, request.modelInstanceId, options, next);
      } else if (status === 'rejected') {
        rejectedDeleteInstance(app, request.modelName, request.modelInstanceId, options, next);
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

function rejectedDeleteInstance(app, modelName, modelInstanceId, options, next) {
  var model = loopback.getModel(modelName, options);

  options._skip_wfx = true;
  model.findById(modelInstanceId, options, function fetchMI(err, instance) {
    if (err) {
      log.error(options, 'error in finding persisted instance', err);
      return next(err);
    }

    if (instance && instance._status && instance._status !== 'private') {
      err = new Error('invalid instance status');
      log.error(options, err);
      return next(err);
    }

    options._skip_wf = true;

    var updates = {
      '_status': 'public',
      '_isDeleted': 'false',
      '_requestId': null,
      '_transactionType': null
    };

    instance.updateAttributes(updates, options, function cb(err, inst) {
      if (err) {
        log.error(options, 'error in updating instance status', err);
        return next(err);
      }
      next(null, inst);
    });
  });
}

function approvedDeleteInstance(app, modelName, modelInstanceId, options, next) {
  var model = loopback.getModel(modelName, options);

  options._skip_wfx = true;

  model.findById(modelInstanceId, options, function fetchMI(err, instance) {
    if (err) {
      log.error(options, 'error in finding persisted instance', err);
      return next(err);
    }

    if (instance && instance._status && instance._status !== 'private') {
      err = new Error('invalid instance status');
      log.error(options, err);
      return next(err);
    }

    options._skip_wf = true;

    var updates = {
      '_status': 'public',
      '_isDeleted': 'true',
      '_transactionType': null
    };

    instance.updateAttributes(updates, options, function cb(err, inst) {
      if (err) {
        log.error(options, 'error in updating instance status', err);
        return next(err);
      }
      next(null, inst);
    });
  });
}

function rejectedUpdateInstance(app, modelName, modelInstanceId, options, next) {
  var model = loopback.getModel(modelName, options);
  options._skip_wfx = true;
  // skip internal after access hook

  model.findById(modelInstanceId, options, function fetchMI(err, instance) {
    if (err) {
      log.error(options, 'error in finding persisted instance', err);
      return next(err);
    }

    if (instance === null) {
      err = new Error('no instance found');
      log.error(options, err);
      return next(err);
    }

    if (instance._status !== 'private') {
      err = new Error('invalid instance status');
      log.error(options, err);
      return next(err);
    }

    // dont set any props inside delta as they were a part of the update instead just remove delta and leave the rest
    options._skip_wf = true;
    // to make a clean update with the observer hooks added by us

    var updates = _.cloneDeep(instance.toObject()._delta);
    updates._status = 'public';
    updates._transactionType = null;
    updates._delta = null;

    instance.updateAttributes(updates, options, function cb(err, inst) {
      if (err) {
        log.error(options, 'error in updating instance', err);
        options._skip_wf = true;

        instance.updateAttributes({
          _status: 'public',
          // gracefully handle error
          _transactionType: 'FAILED-DURING-REJECT-UPDATE'
        }, options, function updateInstance(revertError, revertInst) {
          if (revertError) {
            log.error(options, revertError);
            return next(revertError);
          }
          return next(err);
        });
      }
      next(null, inst);
    });
  });
}

function approvedUpdateInstance(app, modelName, modelInstanceId, wfupdates, options, next) {
  var model = loopback.getModel(modelName, options);
  options._skip_wfx = true;
  // skip internal after access hook

  model.findById(modelInstanceId, options, function fetchMI(err, instance) {
    if (err) {
      log.error(options, 'error in finding persisted instance', err);
      return next(err);
    }

    if (instance === null) {
      err = new Error('no instance found');
      log.error(options, err);
      return next(err);
    }

    if (instance._status !== 'private') {
      err = new Error('invalid instance status');
      log.error(options, err);
      return next(err);
    }

    options._skip_wf = true;

    var updates = {
      _delta: null,
      _status: 'public',
      _transactionType: null
    };

    if (wfupdates) {
      applyWorkflowUpdates(updates, wfupdates);
    }

    instance.updateAttributes(updates, options, function cb(err, inst) {
      if (err) {
        log.error(options, err);
        // if error occured during update revert to previous state but public
        // otherwise the instance will be stuck because of workflow
        return next(err);
      }
      next(null, inst);
    });
  });
}

function rejectedCreateInstance(app, modelName, modelInstanceId, options, next) {
  var model = loopback.getModel(modelName, options);
  options._skip_wfx = true;
  // skip internal after access hook

  model.findById(modelInstanceId, options, function fetchMI(err, instance) {
    if (err) {
      log.error(options, 'error in finding persisted instance', err);
      return next(err);
    }

    if (instance === null) {
      err = new Error('no instance found');
      log.error(options, err);
      return next(err);
    }

    if (instance._status !== 'private') {
      err = new Error('invalid instance status');
      log.error(options, err);
      return next(err);
    }


    options._skip_wf = true;

    instance.destroy(options, function destroyInstance(err, res) {
      if (err) {
        log.error(options, 'error in destroying instance', err);
        return next(err);
      }
      next(null, res);
    });
  });
}

function approvedCreateInstance(app, modelName, modelInstanceId, wfupdates, options, next) {
  var model = loopback.getModel(modelName, options);
  options._skip_wfx = true;
  // skip internal after access hook

  model.findById(modelInstanceId, options, function fetchMI(err, instance) {
    if (err) {
      log.error(options, 'error in finding persisted instance', err);
      return next(err);
    }

    if (instance === null) {
      err = new Error('no instance found');
      log.error(options, err);
      return next(err);
    }

    if (instance._status !== 'private') {
      err = new Error('invalid instance status');
      log.error(options, err);
      return next(err);
    }

    var updates = {
      '_transactionType': null,
      '_status': 'public'
    };

    if (wfupdates) {
      applyWorkflowUpdates(updates, wfupdates);
    }

    options._skip_wf = true;

    instance.updateAttributes(updates, options, function cb(err, inst) {
      if (err) {
        log.error(options, 'error in updating instance', err);
        return next(err);
      }
      next(null, inst);
    });
  });
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
