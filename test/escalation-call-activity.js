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

describe('Test case for Escalation propogation', function cb() {
  this.timeout(15000);
  var name = 'escalationEvent2';
  var callActivityName = 'escalationThrow';
  var testVars = {};
  it('should read the file', function cb(done) {
    fs.readFile(path.resolve('./test/bpmn-files', name + '.bpmn'), 'utf8', (err, data) => {
      testVars.xmldata = data;
      done(err);
    });
  });

  it('should read the call Activity file', function cb(done) {
    fs.readFile(path.resolve('./test/bpmn-files', callActivityName + '.bpmn'), 'utf8', (err, data) => {
      testVars.callActivityData = data;
      done(err);
    });
  });

  it('deploy the callActivity WorkflowDefinition', function cb(done) {
    var defData = { 'name': callActivityName, 'xmldata': testVars.callActivityData };
    models.WorkflowDefinition.create(defData, bootstrap.defaultContext, function cb(err) {
      // Code for duplicate keys
      if (bootstrap.checkDuplicateKeyError(err)) {
        done();
      } else {
        done(err);
      }
    });
  });

  it('deploy the main WorkflowDefinition', function cb(done) {
    var defData = { 'name': name, 'xmldata': testVars.xmldata };
    models.WorkflowDefinition.create(defData, bootstrap.defaultContext, function cb(err) {
      // Code for duplicate keys
      if (bootstrap.checkDuplicateKeyError(err))              {done();}          else {
        done(err);
      }
    });
  });

  it('create workflow instance ', function cb(done) {
    var data = { 'workflowDefinitionName': name };
    models.WorkflowInstance.create(data, bootstrap.defaultContext, function cb(err, instance) {
      if (err) {
        return done(err);
      }
      testVars.mainWorkflowInstance = instance;
      done();
    });
  });

  it('fetch process instance', function cb(done) {
    testVars.mainWorkflowInstance.processes({}, bootstrap.defaultContext, function cb(err, instance) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(instance);
      assert.lengthOf(instance, 1);
      testVars.mainProcess = instance[0];
      setTimeout(done, 2000);
    });
  });

  it('validate main instance', function cb(done) {
    models.ProcessInstance.findById(testVars.mainProcess.id, bootstrap.defaultContext, function cb(err, instance) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(instance);
      testVars.mainProcess = instance;
      done(err);
    });
  });


  it('validate main instance has one subprocess', function cb(done) {
    testVars.mainProcess.subProcesses({}, bootstrap.defaultContext, function cb(err, subProcesses) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(subProcesses);
      assert.isArray(subProcesses);
      assert.lengthOf(subProcesses, 1);
      testVars.subProcess1 = subProcesses[0];
      done(err);
    });
  });

  it('validate subProcess1 instance has one subprocess', function cb(done) {
    testVars.subProcess1.subProcesses({}, bootstrap.defaultContext, function cb(err, subProcesses) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(subProcesses);
      assert.isArray(subProcesses);
      assert.lengthOf(subProcesses, 1);
      testVars.subProcess2 = subProcesses[0];
      done(err);
    });
  });

  it('validate subProcesses2', function cb(done) {
    models.ProcessInstance.findById(testVars.subProcess2.id, bootstrap.defaultContext, function cb(err, instance) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(instance);
      assert.equal(instance._status, 'interrupted');
      var expectedTokens = [
        { 'name': 'Start', 'status': 'complete' },
        { 'name': 'TaskA', 'status': 'complete' },
        { 'name': 'Escalate', 'status': 'complete' },
        { 'name': 'TaskB', 'status': 'interrupted' },
        { 'name': 'End2', 'status': 'complete' }
      ];

      stateVerifier.verifyTokens(instance._processTokens, expectedTokens);
      done();
    });
  });

  it('validate subProcesses1', function cb(done) {
    models.ProcessInstance.findById(testVars.subProcess1.id, bootstrap.defaultContext, function cb(err, instance) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(instance);
      assert.equal(instance._status, 'interrupted');

      var expectedTokens = [
        { 'name': 'Start', 'status': 'complete' },
        { 'name': 'TaskA', 'status': 'complete' },
        { 'name': 'TaskB', 'status': 'interrupted' },
        { 'name': 'Catch', 'status': 'interrupted' }
      ];
      stateVerifier.verifyTokens(instance._processTokens, expectedTokens);
      done();
    });
  });

  it('validate main process', function cb(done) {
    models.ProcessInstance.findById(testVars.mainProcess.id, bootstrap.defaultContext, function cb(err, instance) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(instance);
      assert.equal(instance._status, 'complete');

      var expectedTokens = [
        { 'name': 'Start', 'status': 'complete' },
        { 'name': 'Sub', 'status': 'interrupted' },
        { 'name': 'EscalateCatch', 'status': 'complete' },
        { 'name': 'End2', 'status': 'complete' }
      ];

      stateVerifier.verifyTokens(instance._processTokens, expectedTokens);
      done();
    });
  });
});
