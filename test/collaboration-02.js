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

describe('Test case for collaboration2', function CB() {
  this.timeout(10000);
  var name = 'collaboration2';
  var participant2Name = 'process2';
  var testVars = {};
  it('should read the file', function CB(done) {
    fs.readFile(path.resolve('./test/bpmn-files', name + '.bpmn'), 'utf8', (err, data) => {
      testVars.xmldata = data;
      done(err);
    });
  });

  it('should read the participant2 file', function CB(done) {
    fs.readFile(path.resolve('./test/bpmn-files', 'simpleTest' + '.bpmn'), 'utf8', (err, data) => {
      testVars.participant2 = data;
      done(err);
    });
  });

  it('deploy of the WorkflowDefinition should fail', function CB(done) {
    var defData = { 'name': name, 'xmldata': testVars.xmldata };
    models.WorkflowDefinition.create(defData, bootstrap.defaultContext, function CB(err, def) {
      assert.isDefined(err);
      assert.isNotNull(err);
      done();
    });
  });

  it('deploy the participant2 WorkflowDefinition', function CB(done) {
    var defData = { 'name': participant2Name, 'xmldata': testVars.participant2 };
    models.WorkflowDefinition.create(defData, bootstrap.defaultContext, function CB(err) {
      // Code for duplicate keys
      if (bootstrap.checkDuplicateKeyError(err)) {
        done();
      } else {
        done(err);
      }
    });
  });

  it('deploy the WorkflowDefinition', function CB(done) {
    var defData = { 'name': name, 'xmldata': testVars.xmldata };
    models.WorkflowDefinition.create(defData, bootstrap.defaultContext, function CB(err) {
      // Code for duplicate keys
      if (bootstrap.checkDuplicateKeyError(err)) {
        done();
      } else {
        done(err);
      }
    });
  });

  it('create workflow instance ', function CB(done) {
    var processVariables = {
      'mainProcessV': 'testValue',
      'mainProcessV2': 2
    };
    var data = {
      'workflowDefinitionName': name,
      'processVariables': processVariables
    };
    models.WorkflowInstance.create(data, bootstrap.defaultContext, function CB(err, instance) {
      if (err) {
        return done(err);
      }
      log.debug(instance);
      testVars.mainWorkflowInstance = instance;
      setTimeout(done, 3000);
    });
  });

  it('fetch process instance', function CB(done) {
    testVars.mainWorkflowInstance.processes({}, bootstrap.defaultContext, function CB(err, processes) {
      if (err) {
        return done(err);
      }
      log.debug(processes);
      assert.isNotNull(processes);
      assert.lengthOf(processes, 2);
      testVars.processes = processes;

      if (processes[0].toObject().processDefinitionName === 'process2') {
        testVars.process2 = processes[0];
        testVars.collab = processes[1];
      } else {
        testVars.process2 = processes[1];
        testVars.collab = processes[0];
      }

      setTimeout(done, 3000);
    });
  });

  it('validate tasks of workflow', function cb(done) {
    testVars.process2.tasks({
      'where': {
        'name': 'TaskB'
      }
    }, bootstrap.defaultContext, function cb(err, tasks) {
      if (err) {
        return done(err);
      }
      testVars.tasks = tasks;
      log.debug(tasks);
      done();
    });
  });

  it('complete task 1', function CB(done) {
    testVars.tasks[0].completeTask({}, {
      'taskB': 1
    }, bootstrap.defaultContext, function cb(err, tasks) {
      if (err) {
        return done(err);
      }
      setTimeout(done, 2000);
    });
  });


  it('validate 1st process', function CB(done) {
    models.ProcessInstance.findById(testVars.process2.id, bootstrap.defaultContext, function CB(err, instance) {
      if (err) {
        return done(err);
      }

      assert.isNotNull(instance);
      assert.equal(instance._status, 'complete');
      var expectedVariables = {};
      var expectedFlow = {};

      expectedVariables = {};
      expectedVariables = { 'taskB': 1, 'mainProcessV': 'testValue', 'mainProcessV2': 2 };
      stateVerifier.verifyProcessVariables(instance._processVariables, expectedVariables);
      expectedFlow = {};
      expectedFlow = ['Start', 'TaskB', 'End'];
      stateVerifier.verifyFlow(instance._processTokens, expectedFlow);
      done();
    });
  });

  it('validate 2nd process', function CB(done) {
    models.ProcessInstance.findById(testVars.collab.id, bootstrap.defaultContext, function CB(err, instance) {
      if (err) {
        return done(err);
      }

      assert.isNotNull(instance);
      assert.equal(instance._status, 'complete');
      var expectedVariables = {};
      var expectedFlow = {};

      expectedVariables = {};
      expectedVariables = { 'mainProcessV': 'testValue', 'mainProcessV2': 2 };
      stateVerifier.verifyProcessVariables(instance._processVariables, expectedVariables);
      expectedFlow = {};
      expectedFlow = ['Start', 'TaskA', 'End'];
      stateVerifier.verifyFlow(instance._processTokens, expectedFlow);
      done();
    });
  });
});
