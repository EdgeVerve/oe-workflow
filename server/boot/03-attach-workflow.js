/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
/**
 * Boot Script for attaching workflow on boot for version 2
 * @author Mandeep Gill(mandeep6ill), Prem Sai(premsai-ch)
 */
var logger = require('oe-logger');
var log = logger('attach-workflow.boot');
var applyMakerCheckerMixin1 = require('../../common/mixins/maker-checker-mixin.js');
var applyMakerCheckerMixin2 = require('../../common/mixins/maker-checker-mixin-v2.js');
var workflowMixin = require('../../common/mixins/workflow-mixin-v0.js');
var globalMessaging = require('oe-cloud/lib/common/global-messaging');
module.exports = function attachWorkFlows(app) {
  var WorkflowMapping = app.models.WorkflowMapping;
  var options = {
    ctx: {},
    ignoreAutoScope: true,
    fetchAllScopes: true
  };

  WorkflowMapping.find({
    where: {
      'engineType': 'oe-workflow'
    }
  }, options, function fetchWM(err, result) {
    if (err) {
      log.error(options, err);
    } else {
      var WorkflowMaps = result;
      WorkflowMaps.forEach(function iterateWM(mapping) {
        newMappingHandler(mapping, options);
      });
    }
  });


  function newMappingHandler(mapping, options) {
    var actualModelName = mapping.actualModelName;
    var Model = app.models[actualModelName];
    if (mapping.version === 'v1') {
      applyMakerCheckerMixin1(Model);
    } else if (mapping.version === 'v2') {
      applyMakerCheckerMixin2(Model);
    } else {
      workflowMixin(Model);
    }
  }
  function workflowMappingAfterSave(ctx, next) {
    let data = ctx.data || ctx.instance;
    globalMessaging.publish('workflowMappingAfterSave', { version: data.version, actualModelName: data.actualModelName, modelName: data.modelName }, ctx.options);
    next();
  }

  WorkflowMapping.observe('after save', workflowMappingAfterSave);
  globalMessaging.subscribe('workflowMappingAfterSave', newMappingHandler);
};
