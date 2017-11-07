/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

var logger = require('oe-logger');
var log = logger('ActivitiAccount');

module.exports = function ActivitiAccount(ActivitiAccount) {
  ActivitiAccount.disableRemoteMethod('create', false);
  ActivitiAccount.disableRemoteMethod('upsert', false);
  ActivitiAccount.disableRemoteMethod('updateAll', true);
  // ActivitiAccount.disableRemoteMethod('updateAttributes', false);
  ActivitiAccount.disableRemoteMethod('find', false);
  ActivitiAccount.disableRemoteMethod('findById', true);
  ActivitiAccount.disableRemoteMethod('findOne', true);
  ActivitiAccount.disableRemoteMethod('deleteById', true);
  ActivitiAccount.disableRemoteMethod('count', true);
  ActivitiAccount.disableRemoteMethod('createChangeStream', true);
  ActivitiAccount.disableRemoteMethod('exists', true);
  ActivitiAccount.disableRemoteMethod('history', true);
  ActivitiAccount.disableRemoteMethod('updateById', true);
  ActivitiAccount.disableRemoteMethod('deleteWithVersion', false);

  ActivitiAccount.observe('before save', function beforeSaveAA(ctx, next) {
    if (ctx.instance && ctx.isNewInstance) {
      ActivitiAccount.find({}, ctx.options, function fetchExistingActivitAccount(err, instance) {
        if (err) {
          log.error(ctx.options, err);
          return next(err);
        }
        if (instance.length === 0) {
          // no existing account so create
          return next();
        }
        err = new Error('Only one activiti account per user allowed.');
        log.error(ctx.options, err);
        return next(err);
      });
    } else {
      next();
    }
  });

  ActivitiAccount.observe('after accesss', function afterAccessAA(ctx, next) {
    if (ctx && ctx.options && ctx.options.fetchAllScopes === true) {
      // don't filter
      return next();
    }

    var instances = ctx.accdata;
    var resultData = [];

    try {
      var currUser = ctx.options.ctx.username;
    } catch (ex) {
      var err = new Error('Unable to resolve username in afterAccessHook.');
      log.error(ctx.options, err);
      return next(err);
    }


    for (var i = 0; i < instances.length; i++) {
      var instance = instances[i];

      if (instance._createdBy === currUser) {
        // logic equivalent to putting $owner in model acls - $owner was not working
        resultData.push(instance);
      } else {
        // do nothing
      }
    }

    ctx.accdata = resultData;
    next();
  });
};
