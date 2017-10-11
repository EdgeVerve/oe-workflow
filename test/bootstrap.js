/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

var chalk = require('chalk');
var chai = require('chai');
var assert = chai.assert;
chai.use(require('chai-things'));
var appRoot = require('app-root-path');
var basePath =  'http://localhost:3000/api';
var request = require('request');

var oeapp = appRoot.require('/server/server');

var logger = require('oe-logger');
var accessToken = 'DEFAULT';
var defaultUser = {
  'username': 'default',
  'password': 'default'
};

function login(credentials, cb) {
  var postData = null;
  if (typeof credentials === 'function') {
    postData = {
      'username': defaultUser.username,
      'password': defaultUser.password
    };
    cb = credentials;
  } else {
    postData = credentials;
  }

  rawlogin(postData, function rawloginCB(err, body) {
    if (err) {
      return cb(err);
    }
    cb(null, body);
  });
}

function rawlogout(cb) {
  var logoutUrl = basePath + '/BaseUsers/logout?accessToken=' + bootstrap.token;
  request({ url: logoutUrl, method: 'POST', json: {} }, function rawlogoutrequestCB(err, response) {
    if (err) {
      return cb(err);
    }
    assert.strictEqual( response.statusCode, 200);
    cb(null, response.body);
  });
}

function rawlogin(postData, cb) {
  var postUrl = basePath + '/BaseUsers/login';
  request({ url: postUrl, method: 'POST', json: postData}, function rawloginrequestCB(err, response) {
    if (err) {
      return cb(err);
    }
    assert.strictEqual( response.statusCode, 200);
    bootstrap.token = response.body.id;
    cb(null, response.body);
  });
}

function log(type) {
  var log = {
    debug: function debug() {},
    error: function error() {}
  };

  if (type === 'console') {
    log.debug = function debug(obj) {
      // eslint-disable-next-line
      console.log(JSON.stringify(obj, null, '\t'));
    };
    log.error = function error(obj) {
      // eslint-disable-next-line
      console.error(JSON.stringify(obj, null, '\t'));
    };
  } else if (type === 'oe-logger') {
    var oelog = logger('mocha-test');
    log.debug = function debug(obj) {
      oelog.debug(oelog.defaultContext(), obj);
    };
    log.error = function error(obj) {
      oelog.error(oelog.defaultContext(), obj);
    };
  }
  return log;
}

function checkDuplicateKeyError(err) {
  if (err && (err.code === 11000 || err.statusCode === 422 || err.code === 'DATA_ERROR_071' || err.code === '23505')) {
    return true;
  }
  return false;
}

var bootstrap = module.exports = {
  login: login,
  logout: rawlogout,
  chai: chai,
  app: oeapp,
  appRoot: appRoot,
  models: oeapp.models,
  basePath: basePath,
  log: log,
  checkDuplicateKeyError: checkDuplicateKeyError
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

Object.defineProperty(module.exports, 'adminContext', {
  get: function getadminContext() {
    var callContext = {ctx: {
      tenantId: 'admin',
      remoteUser: 'admin',
      username: 'admin'
    }};
    return callContext;
  }
});

Object.defineProperty(module.exports, 'User1Context', {
  get: function getadminContext() {
    var callContext = {ctx: {
      tenantId: 'default',
      remoteUser: 'user1',
      username: 'user1'
    }};
    return callContext;
  }
});

Object.defineProperty(module.exports, 'User2Context', {
  get: function getadminContext() {
    var callContext = {ctx: {
      tenantId: 'default',
      remoteUser: 'user2',
      username: 'user2'
    }};
    return callContext;
  }
});

Object.defineProperty(module.exports, 'defaultContext', {
  get: function getdefaultContext() {
    var callContext = {ctx: {
      tenantId: 'default',
      remoteUser: 'default',
      username: 'default'
    }};
    return callContext;
  }
});

Object.defineProperty(module.exports, 'token', {
  get: function getToken() {
    return accessToken;
  },
  set: function setToken(token) {
    accessToken = token;
  }
});

describe(chalk.blue('Bootstraping...'), function describeCb() {
  this.timeout(300000);

  before('should wait for boot scripts to complete', function beforeCb(done) {
    oeapp.on('WFStarted', function cb() {
      done();
    });
  });

  it('should happen once app is up', function cb(done) {
    setTimeout(done, 100);
  });
});

describe('Global Test Users Creation', function callback() {
  this.timeout(10000);
  var BaseUser = bootstrap.models.BaseUser;

  it('should create user - user1', function callback(done) {
    BaseUser.create(User1Details, bootstrap.defaultContext, function callback(err, users) {
      if (bootstrap.checkDuplicateKeyError(err)) {
        done();
      } else if (err) {
        return done(err);
      } else {
        assert.isNotNull(users);
        done();
      }
    });
  });

  it('should create user - user2', function callback(done) {
    BaseUser.create(User2Details, bootstrap.defaultContext, function callback(err, users) {
      if (bootstrap.checkDuplicateKeyError(err)) {
        done();
      } else if (err) {
        return done(err);
      } else {
        assert.isNotNull(users);
        done();
      }
    });
  });
});
