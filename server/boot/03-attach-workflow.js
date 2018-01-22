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
var log = logger('attach-workflow.boot');
var applyMakerCheckerMixin = require('../../common/mixins/maker-checker-mixin-v2.js');

module.exports = function attachWorkFlows(app) {
  var WorkflowMapping = app.models.WorkflowMapping;
  var options = {
    ctx: {},
    ignoreAutoScope: true,
    fetchAllScopes: true
  };

  WorkflowMapping.find({
    where: {   'engineType': 'oe-workflow' }
  }, options, function fetchWM(err, result) {
    if (err) {
      log.error(options, err);
    } else {
      var WorkflowMaps = result;
      WorkflowMaps.forEach(function iterateWM(WorkflowMap) {
        // var modelName = WorkflowMap.modelName;
        // var Model = app.models[modelName];
        var actualModelName = WorkflowMap.actualModelName;
        var Model = app.models[actualModelName];

        applyMakerCheckerMixin(Model);
      });
    }
  });
};
