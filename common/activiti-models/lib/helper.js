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
  /* istanbul ignore if*/
  if (typeof ctx === 'function') {
    done = ctx;
    ctx = {};
  }

  var modelNames = [
    'activiti-deployment',
    'activiti-engine',
    'activiti-execution',
    'activiti-form',
    'activiti-group',
    'activiti-history',
    'activiti-job',
    'activiti-model',
    'activiti-process-definition',
    'activiti-process-instance',
    'activiti-runtime',
    'activiti-table',
    'activiti-task',
    'activiti-user'
  ];

  for (var i = 0; i < modelNames.length; i++) {
    var modelName = modelNames[i];
    var dataSourceName = 'ds-' + modelName;
    register.unPersistedConfiguration(modelName, dataSourceName, app, baseUrl);
  }
  log.debug(log.defaultContext(), 'activiti endpoints successfully enabled');
  done(null, 'activiti endpoints successfully enabled');
};
