/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
/**
 * Boot Script for attaching workflow on boot
 * @author Mandeep Gill(mandeep6ill), Prem Sai(premsai-ch), Rohit Khode(kvsrohit)
 */
var logger = require('oe-logger');
var log = logger('workflow-recovery.boot');
var MasterJobExecutor = require('oe-master-job-executor')();
let async = require('async');
module.exports = function recoverWorkflows(app) {
  let intervalInstance;

  let check = {};
  function runRecovery(recoveryConfig, ProcessInstance) {
    var options = {
      ctx: {},
      ignoreAutoScope: true,
      fetchAllScopes: true
    };
    log.info('Running Stale Workflow Checks');
    ProcessInstance.find({
      where: {
        and: [{
          _status: 'running'
        }, {
          passiveWait: false
        }]
      },
      fields: {
        id: true,
        _version: true
      }
    }, options, function fetchPendingPI(err, processes) {
      /* istanbul ignore if*/
      if (err) {
        return log.error(options, err);
      }

      log.info(processes.length + ' potential candidates to recover');
      async.eachLimit(processes, recoveryConfig.batchSize, function checkProcessInstance(process, cb) {
        setTimeout(function setTimeoutCb(process, ProcessInstance, options) {
          ProcessInstance.findById(process.id, options, function fetchPI(err, procT1) {
            /* istanbul ignore if*/
            if (err) {
              log.error(options, err);
            } else if (procT1 && procT1._version === process._version) {
              /* Version is still same after stale period, let's trigger the resume */
              log.info('Trigger recovery for ', procT1.id);
              procT1.recover();
            }
            cb();
          });
        }, recoveryConfig.stalePeriod, process, ProcessInstance, options);
      }, function allDone(err) {
        if (err) {
          log.error(options, err);
        }
        intervalInstance = setTimeout(runRecovery, recoveryConfig.retryInterval, recoveryConfig, ProcessInstance);
        check.a = intervalInstance;
      });
    });
  }

  function start() {
    log.info('Starting workflow monitor');
    let wfConfig = app.get('workflow') || {};
    let recoveryConfig = wfConfig.recovery || {};
    recoveryConfig.batchSize = recoveryConfig.batchSize || 500;
    recoveryConfig.retryInterval = recoveryConfig.retryInterval || 2700000;
    // recoveryConfig.stagger = recoveryConfig.stagger || 120000;
    recoveryConfig.stalePeriod = recoveryConfig.stalePeriod || 2000;

    app.emit('start-workflow-monitoring');
    runRecovery(recoveryConfig, app.models.ProcessInstance);
  }

  function stop() {
    log.info('Stopping workflow monitor');
    if (intervalInstance) {
      clearTimeout(intervalInstance);
      intervalInstance = null;
    }
    app.emit('stop-workflow-monitoring');
  }

  // eslint-disable-next-line no-unused-vars
  let masterJobExecutor = new MasterJobExecutor({
    lockName: 'WORKFLOW-MONITOR',
    masterJob: {
      start: start,
      stop: stop
    }
  });
};
