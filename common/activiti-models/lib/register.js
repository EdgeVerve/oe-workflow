/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
var path = require('path');
var util = require(path.join(__dirname, 'util.js'));

var logger = require('oe-logger');
var log = logger('activiti-register');

var exports = module.exports = {};

// TODO : Boolean doesnt work while specifing template param in Datasource Definition, check why
function updateURL(operations, baseUrl) {
  for (var i = 0; i < operations.length; i++) {
    // updating url with base url
    operations[i].template.url = baseUrl + operations[i].template.url;
  }
}

function addOptions(operations) {
  operations.forEach(op => {
    op.template.headers = op.template.headers || {};
    op.template.headers['x-options'] = '{options:object}';
    Object.keys(op.functions).forEach(fName => {
      op.functions[fName] = op.functions[fName] || [];
      op.functions[fName].push('options');
    });
  });
}

exports.unPersistedConfiguration = function unPersistedConfiguration(modelName, dataSourceName, app, baseUrl) {
  var modelDefinition = require('../dynamic-models/' + modelName + '.json');
  var modelJs = require('../dynamic-models/' + modelName + '.js');

  // var operations = require(path.join(__dirname, '..', 'datasources', dataSourceName + '.json'));
  var operations = require('../datasources/' + dataSourceName + '.json');
  updateURL(operations, baseUrl);
  addOptions(operations);
  var dsDefinition = {
    'name': modelName,
    'connector': require('loopback-connector-rest'),
    'debug': 'false',
    'options': {
      'strictSSL': false
    },
    'operations': operations
  };

  log.debug(log.defaultContext(), 'creating unPersistedConfiguration');
  var ds = util.createDatasource(dsDefinition);
  var model = util.createModel(modelDefinition, modelJs);
  util.mapModelDS(app, model, ds);
  util.addBeforeExecuteConnectorHooks(app, ds);
};
