/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
/**
 * @description Catch Event Handlers
 * @author Kangan Verma(kangan06), Mandeep Gill(mandeep6ill), Prem Sai(premsai-ch), Vivek Mittal(vivekmittal07)
 */

var logger = require('oe-logger');
var log = logger('ProcessInstance');
var StateDelta = require('../../process-state-delta.js');

var SUBPROCESS_INTERRUPT_EVENT = 'PROCESS_TERMINATE';

var exports = module.exports = {};
exports._processTerminateHandler = function _processTerminateHandler(options, processInstance, currentProcess, done) {
  var delta = new StateDelta();
  delta.setProcessStatus('terminated');
  currentProcess.commit(options, delta, function commitCb(err) {
    if (err) {
      log.error(options, err);
      return;
    }
  });
  currentProcess.subProcesses({}, options, function fetchPI(err, subProcesses) {
    if (err) {
      log.error(options, err);
      return;
    }
    for (var i in subProcesses) {
      if (Object.prototype.hasOwnProperty.call(subProcesses, i)) {
        processInstance.emit(SUBPROCESS_INTERRUPT_EVENT, options, processInstance, subProcesses[i]);
      }
    }
  });
};
