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

describe('Test case for Service Task Fail Case', function callback() {
  this.timeout(10000);
  var name = 'service-task-retry';
  var testVars = {};
  it('should read the file', function callback(done) {
    fs.readFile(path.resolve('./test/bpmn-files', name + '.bpmn'), 'utf8', (err, data) => {
      testVars.xmldata = data;
      done(err);
    });
  });

  it('post to bpmndata', function callback(done) {
    var defData = { 'bpmnname': name, 'xmldata': testVars.xmldata, 'versionmessage': '1.0.0'};
    models.bpmndata.create(defData, bootstrap.defaultContext, function callback(err, res) {
      // Code for duplicate keys
      if (err) {
        done(err);
      } else {
        testVars.bpmndataId = res.id;
        done();
      }
    });
  });

  it('deploy the WorkflowDefinition', function callback(done) {
    var defData = { 'name': name, 'xmldata': testVars.xmldata, 'bpmndataId': testVars.bpmndataId };
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
      setTimeout(done, 3000);
    });
  });

  it('fetch failed process instance', function CB(done) {
    models.ProcessInstance.failures({
      where: {
        'workflowInstanceId': testVars.mainWorkflowInstance.id
      },
      'bpmnData': true
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
      testVars.failedTokenId = tokens[0].id;
      done();
    });
  });

  it('validate process before retry', function callback(done) {
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

  it('retry task', function callback(done) {
    testVars.instance.retry(testVars.failedTokenId, {
      processVariables: {
        'modelName': 'ProcessInstances'
      }
    }, bootstrap.defaultContext, function callback(err, instance) {
      if (err) {
        return done(err);
      }
      setTimeout(done, 2000);
    });
  });

  it('validate process after retry', function callback(done) {
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
});

describe('Test case for Service Task Fail Case', function callback() {
  this.timeout(10000);
  var name = 'service-task-retry';
  var testVars = {};
  it('should read the file', function callback(done) {
    fs.readFile(path.resolve('./test/bpmn-files', name + '.bpmn'), 'utf8', (err, data) => {
      testVars.xmldata = data;
      done(err);
    });
  });

  it('post to bpmndata', function callback(done) {
    var defData = { 'bpmnname': name, 'xmldata': testVars.xmldata, 'versionmessage': '1.0.0'};
    models.bpmndata.create(defData, bootstrap.defaultContext, function callback(err, res) {
      // Code for duplicate keys
      if (err) {
        done(err);
      } else {
        testVars.bpmndataId = res.id;
        done();
      }
    });
  });

  it('deploy the WorkflowDefinition', function callback(done) {
    var defData = { 'name': name, 'xmldata': testVars.xmldata, 'bpmndataId': testVars.bpmndataId };
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

    var bulkdata = [];
    for (let i = 0; i < 10; i++) {
      let xdata = JSON.parse(JSON.stringify(data));
      xdata.processVariables.index = i;
      bulkdata.push(xdata);
    }
    models.WorkflowInstance.create(bulkdata, bootstrap.defaultContext, function callback(err, instance) {
      if (err) {
        return done(err);
      }
      testVars.mainWorkflowInstance = instance;
      setTimeout(done, 3000);
    });
  });

  it('should fetch 10 failed process instances', function CB(done) {
    models.ProcessInstance.failures({}, bootstrap.defaultContext, function CB(err, insts) {
      if (err) {
        done(err);
      }
      assert.strictEqual(insts.length, 10);
      done();
    });
  });

  it('retry task', function callback(done) {
    models.ProcessInstance.retryAll({}, {
      processVariables: {
        modelName: 'ProcessInstances'
      }
    }, bootstrap.defaultContext, function callback(err, instance) {
      if (err) {
        return done(err);
      }
      setTimeout(done, 8000);
    });
  });

  it('fetch failed process instance', function CB(done) {
    models.ProcessInstance.failures({}, bootstrap.defaultContext, function CB(err, insts) {
      if (err) {
        done(err);
      }
      assert.strictEqual(insts.length, 0);
      done();
    });
  });
});
