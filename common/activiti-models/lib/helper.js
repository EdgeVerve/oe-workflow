/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
var path = require('path');
var register = require(path.join(__dirname, 'register.js'));

var logger = require('oe-logger');
var log = logger('activiti-manager-helper');

var exports = module.exports = {};

exports._enableActiviti = function _enableActiviti(baseUrl, app, ctx, done) {
  var modelNames = [
    'activiti-deployment',
    'activiti-execution',
    'activiti-model',
    'activiti-process-definition',
    'activiti-process-instance',
    'activiti-task',
    'activiti-history',
    'activiti-form',
    'activiti-table',
    'activiti-engine',
    'activiti-runtime',
    'activiti-job',
    'activiti-user',
    'activiti-group'
  ];

  var dataSourceNames = [
    'ds-activiti-deployment',
    'ds-activiti-execution',
    'ds-activiti-model',
    'ds-activiti-process-definition',
    'ds-activiti-process-instance',
    'ds-activiti-task',
    'ds-activiti-history',
    'ds-activiti-form',
    'ds-activiti-table',
    'ds-activiti-engine',
    'ds-activiti-runtime',
    'ds-activiti-job',
    'ds-activiti-user',
    'ds-activiti-group'
  ];


  for (var i = 0; i < modelNames.length; i++) {
    var modelName = modelNames[i];
    var dataSourceName = dataSourceNames[i];
    register.unPersistedConfiguration(modelName, dataSourceName, app, baseUrl);
  }
  log.debug(log.defaultContext(), 'activiti endpoints successfully enabled');
  done(null, 'activiti endpoints successfully enabled');
};

