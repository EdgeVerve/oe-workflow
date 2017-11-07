/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
/**
 * Boot Script for relationship handing for Roles And Users
 * @author Kangan Verma(kangan06), Mandeep Gill(mandeep6ill), Prem Sai(premsai-ch), Vivek Mittal(vivekmittal07)
 */
var logger = require('oe-logger');
var log = logger('roleHandling.boot');

module.exports = function roleHandling(app) {
  var oe = {};
  oe.bootContext = function bootContext() {
    return {ignoreAutoScope: true, bootContext: true, ctx: {remoteUser: 'system'}};
  };
  var BaseUser = app.models.BaseUser;
  var BaseRole = app.models.BaseRole;
  var Task = app.models.Task;

  BaseUser.hasMany(Task, { polymorphic: {
    foreignKey: 'ownerId',
    discriminator: 'ownerType'
  }, as: 'tasks'
  });
  log.debug(oe.bootContext(), 'relation from base-user to base-role created');

  BaseRole.hasMany(Task, { polymorphic: {
    foreignKey: 'ownerId',
    discriminator: 'ownerType'
  }, as: 'tasks'
  });
  log.debug(oe.bootContext(), 'relation from base-role to base-task created');
};
