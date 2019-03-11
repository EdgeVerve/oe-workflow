/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
/**
 * Boot Script for attaching workflow on boot for version 1&2
 * @author Mandeep Gill(mandeep6ill), Prem Sai(premsai-ch)
 */
var logger = require('oe-logger');
var log = logger('attach-workflow.boot');
var applyMakerCheckerMixin1 = require('../../common/mixins/maker-checker-mixin-v1.js');
var applyMakerCheckerMixin2 = require('../../common/mixins/maker-checker-mixin-v2.js');
var workflowMixin = require('../../common/mixins/workflow-mixin.js');

module.exports = function attachWorkFlows(app) {
  var WorkflowMapping = app.models.WorkflowMapping;
  var options = {
    ctx: {},
    ignoreAutoScope: true,
    fetchAllScopes: true
  };

  WorkflowMapping.find({
    where: {
      and: [{
        engineType: 'oe-workflow'
      }, {
        version: {inq: ['v0', 'v1', 'v2']}
      }]
    }
  }, options, function fetchWM(err, result) {
    /* istanbul ignore if*/
    if (err) {
      log.error(options, err);
    } else {
      var WorkflowMaps = result;
      WorkflowMaps.forEach(mapping => {
        var Model = app.models[mapping.actualModelName];
        if (mapping.version === 'v1') {
          applyMakerCheckerMixin1(Model);
        } else if (mapping.version === 'v2') {
          applyMakerCheckerMixin2(Model);
        } else {
          workflowMixin(Model);
        }
      });
    }
  });
};
