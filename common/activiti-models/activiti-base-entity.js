
/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

/* jshint ignore:start */
module.exports = function BaseEntity(BaseEntity) {
  BaseEntity.about = function about(options, cb) {
    cb(null, 'Dear User, Greeting from Activiti-Integrator.\nFor documentation please refer https://www.activiti.org/userguide/ .\nThanks');
  };

  BaseEntity.remoteMethod('about', {
    returns: {arg: 'greeting', type: 'string'}
  });
};
/* jshint ignore:end */
