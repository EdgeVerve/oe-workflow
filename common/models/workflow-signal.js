/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
/**
 * Implementation of Workflow-Signal
 * @author Mandeep Gill(mandeep6ill)
 */
var logger = require('oe-logger');
var log = logger('Workflow-Signal');
var throwObject = require('./lib/throwobject.js');

module.exports = function WorkflowSignal(WorkflowSignal) {
  /*
   * Broadcasts Workflow Signal to All Applicable Process Instance Executions
   */
  WorkflowSignal.broadcast = function broadcast(signalRef, options, next) {
    if (!signalRef) {
      var error = new Error('SignalRef required to broadcast signal');
      log.error(options, error);
      return next(error);
    }
    WorkflowSignal.find({
      'where': {
        'signalRef': signalRef
      }
    }, options, function fetchRelevantProcesses(err, signalInstances) {
      if (err) {
        log.error(options, err);
        return next(err);
      }
      var numInstances = signalInstances.length;
      var ProcessInstance = WorkflowSignal.app.models.ProcessInstance;

      function sendSignalToInstance(err, process) {
        if (err) {
          return log.error(options, err);
        }
        if (process._status === 'running') {
          // only emit signal in case process is in running state,
          // we will also remove all signals associated with process instance once process completes
          var payload = throwObject.throwObject('signal', signalRef, {
            tokenId: this.tokenId
          });
          ProcessInstance.emit('INTERMEDIATE_CATCH_EVENT', options, ProcessInstance, process, payload);
        }
      }

      for (var i = 0; i < numInstances; i++) {
        var signalInstance = signalInstances[i];
        var processId = signalInstance.processInstanceId;
        var tokenId = signalInstance.tokenId;
        ProcessInstance.findById(processId, options, sendSignalToInstance.bind({ tokenId: tokenId }));
      }

      next(null, {
        count: numInstances
      });
    });
  };

  /*
   * Send Workflow Signal to dedicated Process Instance Execution
   */
  /**
  WorkflowSignal.send = function send(signalRef, processInstanceId, options, next) {
    if (!signalRef || !processInstanceId) {
      var error = new Error('SignalRef & Process Instance Id required to send dedicated signal');
      log.error(options, error);
      return next(error);
    }
    var ProcessInstance = WorkflowSignal.app.models.ProcessInstance;

    ProcessInstance.findById(processInstanceId, options, function fetchProcess(err, process) {
      if (err) {
        log.error(options, err);
        return next(err);
      }
      if (process._status === 'running') {
        WorkflowSignal.find({
          'where': {
            and: [
              {
                'signalRef': signalRef
              }, {
                'processId': process.id
              }
            ]
          }
        }, options, function fetchRelevantProcess(err, signalInstances) {
          if (err) {
            log.error(options, err);
            return next(err);
          }
          for (var i = 0; i < signalInstances.length; i++) {
            var payload = throwObject.throwObject('signal', signalRef, signalInstances[i].tokenId);
            ProcessInstance.emit('INTERMEDIATE_CATCH_EVENT', options, ProcessInstance, process, payload);
          }
          next(null, {
            'count': signalInstances.length
          });
        });
      }
    });
  };
   ***/
};
