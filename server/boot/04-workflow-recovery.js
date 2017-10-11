/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
/**
 * Boot Script for attaching workflow on boot
 * @author Mandeep Gill(mandeep6ill), Prem Sai(premsai-ch)
 */
var logger = require('oe-logger');
var log = logger('workflow-recovery.boot');

module.exports = function attachWorkFlows(app) {
  var ProcessInstance = app.models.ProcessInstance;
  var options = {
    ctx: {},
    ignoreAutoScope: true,
    fetchAllScopes: true
  };

  ProcessInstance.find({
    where: {
      '_status': 'running'
    }
  }, options, function fetchPendingPI(err, processes) {
    if (err) {
      log.error(options, err);
      return;
    }
    for (var i = 0; i < processes.length; i++) {
      var process = processes[i];
      process.recover();
    }
  });
};
