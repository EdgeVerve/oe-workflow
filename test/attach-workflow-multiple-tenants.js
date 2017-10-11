/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

var fs = require('fs');
var path = require('path');
var loopback = require('loopback');

var bootstrap = require('./bootstrap');
var chai = bootstrap.chai;
var assert = chai.assert;
var models = bootstrap.models;
var log = bootstrap.log();

var EvContext = {
  ctx: {
    'tenantId': 'oe',
    'remoteUser': 'user1',
    'username': 'user1'
  }
};
var FinContext = {
  ctx: {
    'tenantId': 'fin',
    'remoteUser': 'user2',
    'username': 'user2'
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

describe('User Creation', function CB() {
  this.timeout(10000);
  var BaseUser = models.BaseUser;

  it('should create user - user1', function CB(done) {
    BaseUser.create(User1Details, bootstrap.defaultContext, function CB(err, users) {
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
    BaseUser.create(User2Details, bootstrap.defaultContext, function CB(err, users) {
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

describe('Test case for Attaching and Managing Workflow with different Tenants', function CB() {
  this.timeout(10000);
  var modelName = 'OEWorkflow_TestingMulti';
  var wfName = 'ExclusiveGateway1';
  var deployedWorkflowName = 'Exclusive-Gateway-attach-workflow-test';
  var testVars = {};

  it('should create testing model [tenant - oe] - ' + modelName, function CB(done) {
    var postData = {
      'name': modelName,
      'base': 'BaseEntity',
      'idInjection': true,
      'options': {
        'validateUpsert': true
      },
      'mixins': {},
      'properties': {
        'luckydraw': {
          'type': 'string',
          'required': false
        }
      },
      'relations': {},
      'validations': []
    };


    models.ModelDefinition.create(postData, EvContext, function CB(err, res) {
      if (err) {
        done(err);
      } else {
        log.debug(res);
        done();
      }
    });
  });

  it('should create testing model [tenant - fin] - ' + modelName, function CB(done) {
    var postData = {
      'name': modelName,
      'base': 'BaseEntity',
      'idInjection': true,
      'options': {
        'validateUpsert': true
      },
      'mixins': {},
      'properties': {
        'luckydraw': {
          'type': 'string',
          'required': false
        }
      },
      'relations': {},
      'validations': []
    };


    models.ModelDefinition.create(postData, FinContext, function CB(err, res) {
      if (err) {
        done(err);
      } else {
        log.debug(res);
        done();
      }
    });
  });

  it('should read the file', function CB(done) {
    fs.readFile(path.resolve('./test/bpmn-files', wfName + '.bpmn'), 'utf8', (err, data) => {
      testVars.xmldata = data;
      done(err);
    });
  });

  it('deploy the WorkflowDefinition [tenant oe]', function CB(done) {
    var defData = { 'name': deployedWorkflowName, 'xmldata': testVars.xmldata };
    models.WorkflowDefinition.create(defData, EvContext, function CB(err, res) {
      // Code for duplicate keys
      log.debug(err);
      log.debug(res);
      if (bootstrap.checkDuplicateKeyError(err)) {
        setTimeout(done, 1000);
      } else {
        setTimeout(function cb() {
          done(err);
        }, 1000);
      }
    });
  });

  it('deploy the WorkflowDefinition [tenant fin]', function CB(done) {
    var defData = { 'name': deployedWorkflowName, 'xmldata': testVars.xmldata };
    models.WorkflowDefinition.create(defData, FinContext, function CB(err, res) {
      // Code for duplicate keys
      log.debug(err);
      log.debug(res);
      if (bootstrap.checkDuplicateKeyError(err)) {
        setTimeout(done, 1000);
      } else {
        setTimeout(function cb() {
          done(err);
        }, 1000);
      }
    });
  });

  it('fetch WorkflowDefinitions [tenant oe]', function CB(done) {
    models.WorkflowDefinition.find({
      'where': {
        'name': deployedWorkflowName
      }
    }, EvContext, function CB(err, res) {
      if (err) {
        return done(err);
      }
      log.debug(res);
      assert.isNotNull(res);
      assert.strictEqual(res.length, 1);
      assert.strictEqual(res[0].name, deployedWorkflowName);
      done();
    });
  });

  it('fetch WorkflowDefinitions [tenant fin]', function CB(done) {
    models.WorkflowDefinition.find({
      'where': {
        'name': deployedWorkflowName
      }
    }, FinContext, function CB(err, res) {
      if (err) {
        return done(err);
      }
      log.debug(res);
      assert.isNotNull(res);
      assert.strictEqual(res.length, 1);
      assert.strictEqual(res[0].name, deployedWorkflowName);
      done();
    });
  });

  it('should attach workflow [tenant oe] to ' + modelName, function CB(done) {
    var attachWorkflowDef = {
      'modelName': modelName,
      'workflowBody': {
        'workflowDefinitionName': deployedWorkflowName
      },
      'operation': 'create',
      'wfDependent': false
    };

    models.WorkflowManager.attachWorkflow(attachWorkflowDef, EvContext, function cb(err, res) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(res);
      setTimeout(done, 1000);
    });
  });

  it('should attach workflow [tenant fin] to ' + modelName, function CB(done) {
    var attachWorkflowDef = {
      'modelName': modelName,
      'workflowBody': {
        'workflowDefinitionName': deployedWorkflowName
      },
      'operation': 'create',
      'wfDependent': false
    };

    models.WorkflowManager.attachWorkflow(attachWorkflowDef, FinContext, function cb(err, res) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(res);
      setTimeout(done, 1000);
    });
  });

  it('should allow user1 to access his attached workflow map, without exposing actual Model Name', function cb(done) {
    models.WorkflowManager.viewAttachedWorkflows({}, EvContext, function cb(err, res) {
      if (err) {
        return done(err);
      }
      log.debug(res);
      assert.strictEqual(res.length, 1);
      done();
    });
  });

  it('should allow user1 to access his attached workflow map, without exposing actual Model Name', function cb(done) {
    models.WorkflowManager.viewAttachedWorkflows({}, FinContext, function cb(err, res) {
      if (err) {
        return done(err);
      }
      log.debug(res);
      assert.strictEqual(res.length, 1);
      done();
    });
  });

  it('should allow user1 to create instance', function cb(done) {
    var model = loopback.getModel(modelName, EvContext);
    model.create({
      'luckydraw': '101'
    }, EvContext, function cb(err, res) {
      if (err) {
        return done(err);
      }
      log.debug(res);
      done();
    });
  });

  it('should allow user1 to create instance', function cb(done) {
    var model = loopback.getModel(modelName, FinContext);
    model.create({
      'luckydraw': '201'
    }, FinContext, function cb(err, res) {
      if (err) {
        return done(err);
      }
      log.debug(res);
      done();
    });
  });
});
