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
var models = bootstrap.models;
var log = bootstrap.log();

var stateVerifier = require('./utils/stateverifier');

describe('Test case for Service Task Fail Case', function callback() {
  this.timeout(10000);
  var name = 'service-task-fail';
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
      if (bootstrap.checkDuplicateKeyError(err)) {
        done();
      } else {
        done(err);
      }
    });
  });

  it('create workflow instance ', function callback(done) {
    var data = {
      'workflowDefinitionName': name,
      'processVariables': {
        'modelName': 'ProcesInstances'
      }
    };
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
      setTimeout(done, 3000);
    });
  });

  it('validate process', function callback(done) {
    models.ProcessInstance.findById(testVars.processes[0].id, bootstrap.defaultContext, function callback(err, instance) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(instance);
      assert.equal(instance._status, 'failed');
      var expectedFlow = ['Start', 'TestService'];
      stateVerifier.verifyFlow(instance._processTokens, expectedFlow);
      testVars.instance = instance;
      done();
    });
  });

  it('validate process', function callback(done) {
    var tokens = testVars.instance._processTokens;
    var token = Object.values(tokens).filter((t) => {
      return t.status === 'failed';
    });
    testVars.failedTokenId = token[0].id;
    done();
  });

  it('retry task', function callback(done) {
    testVars.instance.retry({
      // tokenId: testVars.failedTokenId
      tokenId: testVars.failedTokenId,
      processVariables: {
        'modelName': 'ProcessInstances'
      }
    }, bootstrap.defaultContext, function callback(err, instance) {
      if (err) {
        return done(err);
      }
      setTimeout(done, 5000);
    });
  });

  it('validate process again', function callback(done) {
    models.ProcessInstance.findById(testVars.processes[0].id, bootstrap.defaultContext, function callback(err, instance) {
      if (err) {
        return done(err);
      }

      // assert.isNotNull(instance);
      // assert.equal(instance._status, 'failed');
      // var expectedFlow = ['Start', 'TestService'];
      // stateVerifier.verifyFlow(instance._processTokens, expectedFlow);
      // testVars.instance = instance;
      done();
    });
  });
});

describe.skip('Test case for Service Task Headers without BaseUrl Case', function callback() {
  this.timeout(10000);
  var name = 'service-task-headers';
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

  it('validate process', function callback(done) {
    models.ProcessInstance.findById(testVars.processes[0].id, bootstrap.defaultContext, function callback(err, instance) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(instance);
      assert.equal(instance._status, 'complete');
      var expectedFlow = ['Start', 'Service w/ Headers', 'End'];
      stateVerifier.verifyFlow(instance._processTokens, expectedFlow);
      done();
    });
  });
});
