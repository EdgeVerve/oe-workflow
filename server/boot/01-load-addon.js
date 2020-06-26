/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
/**
 * Boot Script for attaching workflow on boot
 * @author Rohit Khode(kvsrohit)
 */
var logger = require('oe-logger');
var log = logger('load-addon.boot');
var path = require('path');

module.exports = function recoverWorkflows(app) {
  let workflowAddons = {};
  var wfConfig = app.get('workflow') || {};
  if (wfConfig.addonModule) {
    let modulePath = path.resolve(process.cwd(), wfConfig.addonModule);
    log.debug('Trying to load addon module at ' + modulePath);
    workflowAddons = require(modulePath);
    /* No try-catch. let it throw error during startup if specified addon-module is not found */
  }
  if (wfConfig.disableMakerCheckerBeforeSave) {
    workflowAddons.disableMakerCheckerBeforeSave = wfConfig.disableMakerCheckerBeforeSave;
  }
  if (wfConfig.disableMakerCheckerParallelValidations) {
    workflowAddons.disableMakerCheckerParallelValidations = wfConfig.disableMakerCheckerParallelValidations;
  }
  app.workflowAddons = workflowAddons;
};
