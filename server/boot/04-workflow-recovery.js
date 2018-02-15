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
  var BATCH_SIZE = 500;
  var BATCH_TIME = 100000;
  var options = {
    ctx: {},
    ignoreAutoScope: true,
    fetchAllScopes: true
  };

  ProcessInstance.find({
    where: {
      '_status': 'running'
    },
    fields: {
      'id': true
    }
  }, options, function fetchPendingPI(err, processes) {
    if (err) {
      log.error(options, err);
      return;
    }

    var buildFilter = function buildFilter(start, end) {
      let filter = {
        where: {
          or: []
        }
      };
      for (let idx = start; idx < end; idx++) {
        filter.where.or.push({
          id: processes[idx].id
        });
      }
      return filter;
    };

    var NUM_PROCESSES = processes.length;
    var iter = 0;
    var riter = 0;
    console.log('Total batches : ',NUM_PROCESSES/BATCH_SIZE);
    var interval = setInterval(function () {
      let start = iter * BATCH_SIZE;
      let end = (iter + 1) * BATCH_SIZE;
      if (end >= NUM_PROCESSES) {
        clearInterval(interval);
        end = NUM_PROCESSES;
      }

      let filter = buildFilter(start, end);
      console.log('Batch started : ',iter);
      ProcessInstance.find(filter, options, function fetchPendingPI(err, processes) {
        if (err) {
          log.error(options, err);
          return;
        }
        console.log('Recovery started : ',riter);
        riter++;
        let iterx=0;
        processes.forEach(process => {
          process.recover(riter,iterx);
          iterx++;
        })
      });
      iter += 1;
    }, BATCH_TIME);

  });
};
