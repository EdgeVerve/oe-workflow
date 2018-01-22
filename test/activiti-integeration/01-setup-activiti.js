/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

var bootstrap = require('../bootstrap');
var chai = bootstrap.chai;
var assert = chai.assert;
var models = bootstrap.models;
var log = bootstrap.log();

var User1Context = {
  ctx: {
    'tenantId': 'default',
    'remoteUser': 'user1',
    'username': 'user1'
  }
};

var User1Details = {
  'username': 'user1',
  'email': 'user1@oe.com',
  'password': 'user1',
  'id': 'user1'
};

var User2Details = {
  'username': 'user2',
  'email': 'user2@oe.com',
  'password': 'user2',
  'id': 'user2'
};

var demouser = 'kermit';

describe('User Creation', function CB() {
  this.timeout(10000);

  it('should create user - user1', function CB(done) {
    models.BaseUser.create(User1Details, bootstrap.defaultContext, function CB(err, users) {
      if (bootstrap.checkDuplicateKeyError(err)) {
        log.debug(users);
        done();
      } else if (err) {
        log.error(err);
        return done(err);
      } else {
        log.debug(users);
        assert.isNotNull(users);
        done();
      }
    });
  });

  it('should create user - user2', function CB(done) {
    models.BaseUser.create(User2Details, bootstrap.defaultContext, function CB(err, users) {
      if (bootstrap.checkDuplicateKeyError(err)) {
        log.debug(users);
        done();
      } else if (err) {
        log.error(err);
        return done(err);
      } else {
        log.debug(users);
        assert.isNotNull(users);
        done();
      }
    });
  });
});

describe('Activiti Setup Creation', function CB() {
  this.timeout(10000);

  it('should initiate activiti models dynamically', function cb(done) {
    var ActivitiManager = models.Activiti_Manager;
    var url = process.env.ACTIVITI_HOST + '/activiti-rest/service/';

    ActivitiManager.enable(url, User1Context, function cb(err, res) {
      if (err) {
        log.error(err);
        done(err);
      }
      log.debug(res);
      done();
    });
  });

  it('should register an activiti account - User', function cb(done) {
    models.Activiti_Account.create({
      'username': demouser,
      'password': demouser
    }, User1Context, function cb(err, instance) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(instance);
      done();
    });
  });
});
