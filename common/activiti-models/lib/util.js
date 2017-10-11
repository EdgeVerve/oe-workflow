/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
var exports = module.exports = {};
var loopback = require('loopback');
var logger = require('oe-logger');
var log = logger('activiti-util');

exports.createModel = function createModel(modelDefn, customizeFn, options) {
  var Model = loopback.createModel(modelDefn);
  if (customizeFn) {
    customizeFn(Model, options);
  }
  Model.clientModelName = Model.modelName;
  Model.clientPlural = Model.pluralModelName;
  log.debug(log.defaultContext(), 'ModelDefinition successfully created : ' + modelDefn.name);
  return Model;
};

exports.createDatasource = function createDatasource(datasourceDefn) {
  var datasource = loopback.createDataSource(datasourceDefn);
  return datasource;
};

exports.mapModelDS = function mapModelDS(app, model, ds) {
  app.model(model, {dataSource: ds });
  log.debug(log.defaultContext(), 'datasource mapping successfully created : ' + model.name + ' , ' + ds.name);
  return;
};

exports.addBeforeExecuteConnectorHooks = function addBeforeExecuteConnectorHooks(app, ds) {
  var connector = ds.connector;
  connector.observe('before execute', function beforeExecuteConnectorHookCb(ctx, next) {
    /*
     * ctx.options is available now
     */
    app.models.Activiti_Account.find({}, ctx.options, function fetchAccountDetails(err, account) {
      if (err) {
        log.error(ctx.options, err);
        return next(err);
      }
      if (account.length === 0) {
        err = new Error('Please setup Activiti Account by posting details to Activiti_Account.');
        log.error(ctx.options, err);
        return next(err);
      }

      // if the context is passed correctly there will always be one account returned for a single user
      var user     = account[0].username;
      var password = account[0].password;

      ctx.req.auth = {
        user: user,
        password: password
      };

      next();
    });
  });
};

