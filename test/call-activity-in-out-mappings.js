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
  var name = 'call-activity-in-out-mappings';
  var callActivityName = 'call-activity-sub-flow';
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
    var defData = { 'name': 'call-activity-sub-flow', 'xmldata': testVars.callActivityData };
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
    var processVariables = { 'mainPV1': 'mainPVvalue' };
    var data = { 'workflowDefinitionName': name, 'processVariables': processVariables };
    models.WorkflowInstance.create(data, bootstrap.defaultContext, function CB(err, instance) {
      if (err) {
        return done(err);
      }
      testVars.mainWorkflowInstance = instance;
      done();
    });
  });

  it('fetch process instance', function CB(done) {
    testVars.mainWorkflowInstance.processes({}, bootstrap.defaultContext, function CB(err, instance) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(instance);
      assert.lengthOf(instance, 1);
      testVars.mainProcess = instance[0];
      setTimeout(done, 2000);
    });
  });


  it('validate main instance', function CB(done) {
    models.ProcessInstance.findById(testVars.mainProcess.id, bootstrap.defaultContext, function CB(err, instance) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(instance);
      testVars.mainProcess = instance;
      done();
    });
  });

  it('validate main instance has no parent', function CB(done) {
    testVars.mainProcess.parentProcess({}, bootstrap.defaultContext, function CB(err, instance) {
      if (err) {
        return done(err);
      }
      assert.isUndefined(instance);
      done();
    });
  });

  it('validate main instance has one subprocess', function CB(done) {
    testVars.mainProcess.subProcesses({}, bootstrap.defaultContext, function CB(err, subProcesses) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(subProcesses);
      assert.isArray(subProcesses);
      assert.lengthOf(subProcesses, 1);
      testVars.subProcess = subProcesses[0];
      done();
    });
  });

  it('validate parent of subProcesses', function CB(done) {
    testVars.subProcess.parentProcess({}, bootstrap.defaultContext, function CB(err, instance) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(instance);
      assert.deepEqual(testVars.mainProcess.id, instance.id);
      done();
    });
  });

  it('main process should have no change', function CB(done) {
    models.ProcessInstance.findById(testVars.mainProcess.id, bootstrap.defaultContext, function CB(err, instance) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(instance);
      assert.deepEqual(instance._processTokens, testVars.mainProcess._processTokens);
      var expectedVariables = {
        'mainPV1': 'mainPVvalue',
        'mainPV2': 'subPVvalue'
      };
      stateVerifier.verifyProcessVariables(instance._processVariables, expectedVariables);
      assert.deepEqual(instance._status, testVars.mainProcess._status);
      done();
    });
  });

  it('validate 2nd subProcesses', function CB(done) {
    models.ProcessInstance.findById(testVars.subProcess.id, bootstrap.defaultContext, function CB(err, instance) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(instance);
      assert.equal(instance._status, 'complete');
      var expectedVariables = {
        'subPV1': 'mainPVvalue',
        'subPV2': 'subPVvalue',
        'Input1': 'Awesome'
      };
      stateVerifier.verifyProcessVariables(instance._processVariables, expectedVariables);
      var expectedFlow = ['Start', 'script task', 'End'];
      stateVerifier.verifyFlow(instance._processTokens, expectedFlow);
      done();
    });
  });

  it('validate main process', function CB(done) {
    models.ProcessInstance.findById(testVars.mainProcess.id, bootstrap.defaultContext, function CB(err, instance) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(instance);
      assert.equal(instance._status, 'complete');
      var expectedVariables = {
        'mainPV1': 'mainPVvalue',
        'mainPV2': 'subPVvalue'
      };
      stateVerifier.verifyProcessVariables(instance._processVariables, expectedVariables);
      var expectedFlow = ['Start', 'CallActivityObj', 'End'];
      stateVerifier.verifyFlow(instance._processTokens, expectedFlow);
      done();
    });
  });
});
