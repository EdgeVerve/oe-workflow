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

var stateVerifier = require('./utils/stateverifier');

describe('Test case for callActivity', function CB() {
  this.timeout(15000);
  var name = 'call-activity-parent-retry-parallel';
  var callActivityName = 'call-activity-child-retry';
  var testVars = {};
  it('should read the file', function CB(done) {
    fs.readFile(path.resolve('./test/bpmn-files', name + '.bpmn'), 'utf8', (err, data) => {
      testVars.xmldata = data;
      done(err);
    });
  });

  it('should read the call Activity file', function CB(done) {
    fs.readFile(path.resolve('./test/bpmn-files', callActivityName + '.bpmn'), 'utf8', (err, data) => {
      testVars.callActivityData = data;
      done(err);
    });
  });

  it('deploy the callActivity WorkflowDefinition', function CB(done) {
    var defData = { 'name': callActivityName, 'xmldata': testVars.callActivityData };
    models.WorkflowDefinition.create(defData, bootstrap.defaultContext, function CB(err) {
      // Code for duplicate keys
      if (bootstrap.checkDuplicateKeyError(err)) {
        done();
      } else {
        done(err);
      }
    });
  });

  it('deploy the main WorkflowDefinition', function CB(done) {
    var defData = { 'name': name, 'xmldata': testVars.xmldata };
    models.WorkflowDefinition.create(defData, bootstrap.defaultContext, function CB(err) {
      // Code for duplicate keys
      if (bootstrap.checkDuplicateKeyError(err))              {done();}          else {
        done(err);
      }
    });
  });

  it('create workflow instance ', function CB(done) {
    var processVariables = { 'modelName': 'ProcesInstances' };
    var data = { 'workflowDefinitionName': name, 'processVariables': processVariables };
    models.WorkflowInstance.create(data, bootstrap.defaultContext, function CB(err, instance) {
      if (err) {
        return done(err);
      }
      testVars.mainWorkflowInstance = instance;
      setTimeout(done, 6000);
    });
  });

  it('fetch failed process instance', function CB(done) {
    models.ProcessInstance.failures({
      where : {
        'workflowInstanceId' : testVars.mainWorkflowInstance.id
      }
    }, bootstrap.defaultContext, function CB(err, insts) {
      if (err) {
        done(err);
      }
      assert.strictEqual(insts.length, 1);
      testVars.retryInstance = insts[0];
      testVars.retryInstanceId = insts[0].id;
      done();
    });
  });

  it('fetch failed process instance token', function CB(done) {
    testVars.retryInstance.failureTokens(bootstrap.defaultContext, function CB(err, tokens) {
      if (err) {
        done(err);
      }
      assert.strictEqual(tokens.length, 1);
      assert.strictEqual(tokens[0].status, 'failed');
      assert.strictEqual(tokens[0].name, 'TestService');
      testVars.tokenId = tokens[0].id;
      done();
    });
  });

  it('validate child process before retry', function callback(done) {
    models.ProcessInstance.findById(testVars.retryInstanceId, bootstrap.defaultContext, function callback(err, instance) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(instance);
      assert.equal(instance._status, 'running');
      var expectedFlow = ['Start', 'TestService'];
      stateVerifier.verifyFlow(instance._processTokens, expectedFlow);
      testVars.instance = instance;
      done();
    });
  });

  it('validate parent process before retry', function callback(done) {
    testVars.instance.parentProcess(bootstrap.defaultContext, function callback(err, instance) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(instance);
      assert.equal(instance._status, 'running');
      done();
    });
  });
  it('retry failed process instance', function CB(done) {
    models.ProcessInstance.findById(testVars.retryInstanceId, bootstrap.defaultContext, function CB(err, inst) {
      if (err) {
        done(err);
      }
      inst.retry(testVars.tokenId, {
        processVariables: {
          modelName: 'ProcessInstances'
        }
      }, bootstrap.defaultContext, function cb(err, inst) {
        if (err) {
          done(err);
        }
        setTimeout(done, 2000);
      });
    });
  });

  it('validate child process after retry', function callback(done) {
    models.ProcessInstance.findById(testVars.retryInstanceId, bootstrap.defaultContext, function callback(err, instance) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(instance);
      assert.equal(instance._status, 'complete');
      var expectedFlow = ['Start', 'TestService', 'End'];
      stateVerifier.verifyFlow(instance._processTokens, expectedFlow);
      testVars.instance = instance;
      done();
    });
  });

  it('validate parent process after retry', function callback(done) {
    testVars.instance.parentProcess(bootstrap.defaultContext, function callback(err, instance) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(instance);
      assert.equal(instance._status, 'complete');
      done();
    });
  });
});
