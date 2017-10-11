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
var fs = require('fs');
var path = require('path');

module.exports = function uploadBpmnTemplates(app, next) {
  var BaseWorkflowBpmn;
  var RelatedWorkflowBpmn;
  var models = app.models;
  var context = {
    ctx: {
      'tenantId': 'default',
      'remoteUser': 'default',
      'username': 'default'
    }
  };

  fs.readFile(path.join(__dirname, 'bpmn-templates/BaseWorkflow.bpmn'), 'utf8', (err, data) => {
    if (err) {
      log.error(log.defaultContext(), err);
      return next(err);
    }
    BaseWorkflowBpmn = data;
    fs.readFile(path.join(__dirname, 'bpmn-templates/RelatedWorkflow.bpmn'), 'utf8', (err, data) => {
      if (err) {
        log.error(log.defaultContext(), err);
        return next(err);
      }
      RelatedWorkflowBpmn = data;
      var bpmnData = [
        {
          'bpmnname': 'BaseWorkflowTemplate',
          'versionmessage': '1.0.0',
          'xmldata': BaseWorkflowBpmn
        }, {
          'bpmnname': 'RelatedWorkflowTemplate',
          'versionmessage': '1.0.0',
          'xmldata': RelatedWorkflowBpmn
        }
      ];

      models.bpmndata.create(bpmnData, context, function cb(err, res) {
        if (err) {
          log.error(log.defaultContext(), err);
        }
      });

      var BaseWorkflowDefn = {'name': 'BaseWorkflowTemplate', 'xmldata': BaseWorkflowBpmn};
      models.WorkflowDefinition.findOrCreate({
        where: {
          name: BaseWorkflowDefn.name
        }
      }, BaseWorkflowDefn, context, function internalcb(err, res) {
        // Code for duplicate keys
        if (err && err.code !== 11000 && err.code !== 'DATA_ERROR_071' ) {
          log.error(log.defaultContext(), err);
          return next(err);
        }
        var RelatedWorkflowDefn = {'name': 'RelatedWorkflowTemplate', 'xmldata': RelatedWorkflowBpmn};
        models.WorkflowDefinition.findOrCreate({
          where: {
            name: RelatedWorkflowDefn.name
          }
        }, RelatedWorkflowDefn, context, function internalcb(err, res) {
        // Code for duplicate keys
          if (err && err.code !== 11000 && err.code !== 'DATA_ERROR_071' ) {
            log.error(log.defaultContext(), err);
            return next(err);
          }
          log.debug(log.defaultContext(), 'Workflow templates uploaded successfully');
          next();
        });
      });
    });
  });
};
