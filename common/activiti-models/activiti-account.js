/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

var logger = require('oe-logger');
var log = logger('ActivitiAccount');

module.exports = function ActivitiAccount(ActivitiAccount) {
  ActivitiAccount.disableRemoteMethodByName('create', false);
  ActivitiAccount.disableRemoteMethodByName('upsert', false);
  ActivitiAccount.disableRemoteMethodByName('updateAll', true);
  // ActivitiAccount.disableRemoteMethod('updateAttributes', false);
  ActivitiAccount.disableRemoteMethodByName('find', false);
  ActivitiAccount.disableRemoteMethodByName('findById', true);
  ActivitiAccount.disableRemoteMethodByName('findOne', true);
  ActivitiAccount.disableRemoteMethodByName('deleteById', true);
  ActivitiAccount.disableRemoteMethodByName('count', true);
  ActivitiAccount.disableRemoteMethodByName('createChangeStream', true);
  ActivitiAccount.disableRemoteMethodByName('exists', true);
  ActivitiAccount.disableRemoteMethodByName('history', true);
  ActivitiAccount.disableRemoteMethodByName('updateById', true);
  ActivitiAccount.disableRemoteMethodByName('deleteWithVersion', false);

  ActivitiAccount.observe('before save', function beforeSaveAA(ctx, next) {
    if (ctx.instance && ctx.isNewInstance) {
      ActivitiAccount.find({}, ctx.options, function fetchExistingActivitAccount(err, instance) {
        /* istanbul ignore if*/
        if (err) {
          log.error(ctx.options, err);
          return next(err);
        }
        if (instance.length === 0) {
          // no existing account so create
          return next();
        }
        err = new Error('Activiti account already exists');
        log.error(ctx.options, err.message);
        return next(err);
      });
    } else {
      next();
    }
  });

  ActivitiAccount.observe('access', function limitToUser(ctx, next) {
    let userName;
    if (ctx && ctx.options && ctx.options.ctx) {
      userName = ctx.options.ctx.username;
    }
    if (!userName) {
      var err = new Error('Unauthorized');
      err.status = 401;
      return next(err);
    }
    ctx.query.where = ctx.query.where || {};
    ctx.query.where._createdBy = userName;
    next();
  });
};
