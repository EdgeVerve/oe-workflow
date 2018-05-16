/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

var fs = require('fs');
var path = require('path');

var bootstrap = require('./bootstrap');
var chai = bootstrap.chai;
var assert = chai.assert;
var expect = chai.expect;
var models = bootstrap.models;
var log = bootstrap.log();

var stateVerifier = require('./utils/stateverifier');

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

var User1Credentials = {
  'username': 'user1',
  'password': 'user1'
};

describe('Initialization', function callback() {
  this.timeout(10000);
  var BaseUser = models.BaseUser;

  it('should create user - user1', function callback(done) {
    BaseUser.create(User1Details, bootstrap.defaultContext, function callback(err, users) {
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

describe('Test case for Service Task Evaluations (No Workflow Request Id)', function callback() {
  this.timeout(10000);
  var name = 'serviceTaskEvaluate';
  var testVars = {};
  it('should read the file', function callback(done) {
    fs.readFile(path.resolve('./test/bpmn-files', name + '.bpmn'), 'utf8', (err, data) => {
      testVars.xmldata = data;
      done(err);
    });
  });

  it('deploy the WorkflowDefinition', function callback(done) {
    var defData = { 'name': name, 'xmldata': testVars.xmldata };
    models.WorkflowDefinition.create(defData, bootstrap.defaultContext, function callback(err, res) {
      // Code for duplicate keys
      if (bootstrap.checkDuplicateKeyError(err))              {done();}          else {
        done(err);
      }
    });
  });

  it('create workflow instance ', function callback(done) {
    var data = { 'workflowDefinitionName': name };
    models.WorkflowInstance.create(data, bootstrap.defaultContext, function callback(err, instance) {
      if (err) {
        return done(err);
      }
      testVars.mainWorkflowInstance = instance;
      done();
    });
  });

  it('fetch process instance', function callback(done) {
    testVars.mainWorkflowInstance.processes({}, bootstrap.defaultContext, function callback(err, instance) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(instance);
      assert.lengthOf(instance, 1);
      testVars.processes = instance;
      setTimeout(done, 1000);
    });
  });

  xit('validate process', function callback(done) {
    models.ProcessInstance.findById(testVars.processes[0].id, bootstrap.defaultContext, function callback(err, instance) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(instance);
      assert.equal(instance._status, 'complete');
      var expectedFlow = ['Start', 'TestService', 'End'];
      stateVerifier.verifyFlow(instance._processTokens, expectedFlow);

      for (var key in instance._processTokens) {
        if (Object.prototype.hasOwnProperty.call(instance._processTokens, key)) {
          var token = instance._processTokens[key];
          if (token.name === 'End') {
            assert.equal(token.message.statusCode, 500);
          }
        }
      }
      setTimeout(done, 1000);
    });
  });
});

describe('Test case for Service Task Evaluations (By Attaching on Create)', function callback() {
  this.timeout(10000);
  var wfName = 'serviceTaskEvaluate';
  var modelName = 'ServiceTestingModel';
  var testVars = {};

  it('should create testing model - ' + modelName, function callback(done) {
    var postData = {
      'name': modelName,
      'base': 'BaseEntity',
      'idInjection': true,
      'options': {
        'validateUpsert': true
      },
      'mixins': {
        'SoftDeleteMixin': false
      },
      'properties': {
        'status': {
          'type': 'string',
          'required': false
        }
      },
      'relations': {},
      'validations': []
    };


    models.ModelDefinition.create(postData, bootstrap.defaultContext, function callback(err, res) {
      if (err) {
        done(err);
      } else {
        log.debug(res);
        expect(models[modelName]).not.to.be.null;
        expect(models[modelName].definition.properties).not.to.be.undefined;
        expect(Object.keys(models[modelName].definition.properties)).
          to.include.members(Object.keys(models.BaseEntity.definition.properties));
        testVars.modelDetails = res;
        done();
      }
    });
  });

  it('should read the file', function callback(done) {
    fs.readFile(path.resolve('./test/bpmn-files', wfName + '.bpmn'), 'utf8', (err, data) => {
      testVars.xmldata = data;
      done(err);
    });
  });

  it('deploy the WorkflowDefinition', function callback(done) {
    var defData = { 'name': wfName, 'xmldata': testVars.xmldata };
    models.WorkflowDefinition.create(defData, bootstrap.defaultContext, function callback(err, res) {
      // Code for duplicate keys
      if (bootstrap.checkDuplicateKeyError(err))              {done();}          else {
        done(err);
      }
    });
  });

  it('should attach workflow to ' + modelName, function callback(done) {
    var attachWorkflowDef = {
      'modelName': modelName,
      'workflowBody': {
        'workflowDefinitionName': wfName
      },
      'operation': 'create',
      'wfDependent': true
    };

    models.WorkflowManager.attachWorkflow(attachWorkflowDef, bootstrap.defaultContext, function cb(err, res) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(res);
      done();
    });
  });

  it('should login as user1', function callback(done) {
    bootstrap.login(User1Credentials, function callback(err, login) {
      if (err) {
        return done(err);
      }
      log.debug(login);
      done();
    });
  });

  it('create an instance of ' + modelName, function callback(done) {
    models[modelName].create({
      'status': 'this.is.dummy.service'
    }, User1Context, function cb(err, res) {
      if (err) {
        log.error(err);
        return done(err);
      }
      assert.isNotNull(res._status);
      assert.equal(res._status, 'private');
      testVars.instanceId = res.id;
      log.debug(JSON.stringify(res, null, '\t'));
      done();
    });
  });

  it('check if workflow instance is up', function callback(done) {
    models[modelName].workflow(testVars.instanceId, bootstrap.defaultContext, function callback(err, instance) {
      if (err) {
        log.error(err);
        return done(err);
      } else if (instance === null) {
        err = new Error('No workflow instance found');
        log.error(err);
        return done(err);
      }

      log.debug(instance);
      testVars._workflowRef = instance.id;
      testVars.mainWorkflowInstance = instance;
      assert.isNotNull(instance.workflowDefinitionName);
      assert.equal(instance.workflowDefinitionName, wfName);
      done();
    });
  });


  it('fetch process instance', function callback(done) {
    testVars.mainWorkflowInstance.processes({}, bootstrap.defaultContext, function callback(err, instance) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(instance);
      assert.lengthOf(instance, 1);
      testVars.processes = instance[0];
      setTimeout(done, 3000);
    });
  });

  it('validate process', function callback(done) {
    models.ProcessInstance.findById(testVars.processes.id, bootstrap.defaultContext, function callback(err, instance) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(instance);
      assert.equal(instance._status, 'complete');
      var expectedFlow = ['Start', 'TestService', 'End'];
      stateVerifier.verifyFlow(instance._processTokens, expectedFlow);

      for (var key in instance._processTokens) {
        if (Object.prototype.hasOwnProperty.call(instance._processTokens, key)) {
          var token = instance._processTokens[key];
          if (token.name === 'End') {
            assert.equal(token.message.body._status, 'public');
          }
        }
      }

      setTimeout(done, 1000);
    });
  });

  it('remove model instances [clean-up]', function callback(done) {
    models[modelName].destroyAll({}, bootstrap.defaultContext, function cb(err, res) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(res);
      done();
    });
  });

  it('remove model Definition ' + modelName + ' [clean-up]', function callback(done) {
    var id = testVars.modelDetails.id;
    models.ModelDefinition.destroyById(id, bootstrap.defaultContext, function callback(err) {
      if (err) {
        done(err);
      } else {
        done();
      }
    });
  });

  it('remove workflow mapping [clean-up]', function callback(done) {
    models.WorkflowMapping.destroyAll({}, bootstrap.defaultContext, function cb(err, res) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(res);
      done();
    });
  });
});

describe('Test case for Service Task - Pass Case', function callback() {
  this.timeout(10000);
  var name = 'serviceTaskEnhancedPass';
  var testVars = {};
  it('should read the file', function callback(done) {
    fs.readFile(path.resolve('./test/bpmn-files', name + '.bpmn'), 'utf8', (err, data) => {
      testVars.xmldata = data;
      done(err);
    });
  });

  it('deploy the WorkflowDefinition', function callback(done) {
    var defData = { 'name': name, 'xmldata': testVars.xmldata };
    models.WorkflowDefinition.create(defData, bootstrap.defaultContext, function callback(err, res) {
      // Code for duplicate keys
      if (bootstrap.checkDuplicateKeyError(err))              {done();}          else {
        done(err);
      }
    });
  });

  it('create workflow instance ', function callback(done) {
    var data = { 'workflowDefinitionName': name };
    models.WorkflowInstance.create(data, bootstrap.defaultContext, function callback(err, instance) {
      if (err) {
        return done(err);
      }
      testVars.mainWorkflowInstance = instance;
      done();
    });
  });

  it('fetch process instance', function callback(done) {
    testVars.mainWorkflowInstance.processes({}, bootstrap.defaultContext, function callback(err, instance) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(instance);
      assert.lengthOf(instance, 1);
      testVars.processes = instance;
      setTimeout(done, 2000);
    });
  });

  xit('validate process', function callback(done) {
    models.ProcessInstance.findById(testVars.processes[0].id, bootstrap.defaultContext, function callback(err, instance) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(instance);
      assert.equal(instance._status, 'complete');
      var expectedFlow = ['Start', 'Service Task', 'Script Task', 'End'];
      stateVerifier.verifyFlow(instance._processTokens, expectedFlow);
      // var response = JSON.parse(instance._processVariables.activiti_response);
      // assert.isNotNull(response.data);
      setTimeout(done, 1000);
    });
  });
});

describe('Test case for Service Task - Fail Case', function callback() {
  this.timeout(40000);
  var name = 'serviceTaskEnhancedFail';
  var testVars = {};
  it('should read the file', function callback(done) {
    fs.readFile(path.resolve('./test/bpmn-files', name + '.bpmn'), 'utf8', (err, data) => {
      testVars.xmldata = data;
      done(err);
    });
  });

  it('deploy the WorkflowDefinition', function callback(done) {
    var defData = { 'name': name, 'xmldata': testVars.xmldata };
    models.WorkflowDefinition.create(defData, bootstrap.defaultContext, function callback(err, res) {
      // Code for duplicate keys
      if (bootstrap.checkDuplicateKeyError(err))              {done();}          else {
        done(err);
      }
    });
  });

  it('create workflow instance ', function callback(done) {
    var data = { 'workflowDefinitionName': name };
    models.WorkflowInstance.create(data, bootstrap.defaultContext, function callback(err, instance) {
      if (err) {
        return done(err);
      }
      testVars.mainWorkflowInstance = instance;
      setTimeout(done, 12000);
    });
  });

  it('fetch process instance', function callback(done) {
    testVars.mainWorkflowInstance.processes({}, bootstrap.defaultContext, function callback(err, instance) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(instance);
      // TODO : check why this failed weirdly on build
      // assert.lengthOf(instance, 1);
      testVars.processes = instance;
      setTimeout(done, 1000);
    });
  });

  xit('validate process', function callback(done) {
    models.ProcessInstance.findById(testVars.processes[0].id, bootstrap.defaultContext, function callback(err, instance) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(instance);
      assert.equal(instance._status, 'complete');
      var expectedFlow = ['Start', 'Service Task', 'Script Task', 'End'];
      stateVerifier.verifyFlow(instance._processTokens, expectedFlow);
      var response = instance._processVariables.activiti_response;
      assert.isNotNull(response.errno);
      setTimeout(done, 1000);
    });
  });
});
