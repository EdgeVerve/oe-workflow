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

describe('Test case for subprocess', function callback() {
  this.timeout(15000);
  var name = 'subProcess';
  var testVars = {};

  it('should read the file', function callback(done) {
    fs.readFile(path.resolve('./test/bpmn-files', name + '.bpmn'), 'utf8', (err, data) => {
      testVars.xmldata = data;
      done(err);
    });
  });

  it('deploy the WorkflowDefinition', function callback(done) {
    var defData = { 'name': name, 'xmldata': testVars.xmldata };
    models.WorkflowDefinition.create(defData, bootstrap.defaultContext, function callback(err) {
      // Code for duplicate keys
      if (bootstrap.checkDuplicateKeyError(err))              {done();}          else {
        done(err);
      }
    });
  });

  it('create workflow instance ', function callback(done) {
    var processVariables = { 'mainProcessV': 'testValue', 'mainProcessV2': 2 };
    var data = { 'workflowDefinitionName': name, 'processVariables': processVariables };
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
      testVars.mainProcess = instance[0];
      setTimeout(done, 2000);
    });
  });

  it('validate main instance', function callback(done) {
    models.ProcessInstance.findById(testVars.mainProcess.id, bootstrap.defaultContext, function callback(err, instance) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(instance);
      testVars.mainProcess = instance;
      done(err);
    });
  });

  it('validate main instance has no parent', function callback(done) {
    testVars.mainProcess.parentProcess({}, bootstrap.defaultContext, function callback(err, instance) {
      if (err) {
        return done(err);
      }
      assert.isUndefined(instance);
      done(err);
    });
  });

  it('validate main instance has one subprocess', function callback(done) {
    testVars.mainProcess.subProcesses({}, bootstrap.defaultContext, function callback(err, subProcesses) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(subProcesses);
      assert.isArray(subProcesses);
      assert.lengthOf(subProcesses, 1);
      testVars.subProcess = subProcesses[0];
      done(err);
    });
  });

  it('validate parent of subProcesses', function callback(done) {
    testVars.subProcess.parentProcess({}, bootstrap.defaultContext, function callback(err, instance) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(instance);
      assert.deepEqual(testVars.mainProcess.id, instance.id);
      done(err);
    });
  });

  it('validate subprocess has zero child processes', function callback(done) {
    testVars.subProcess.subProcesses({}, bootstrap.defaultContext, function callback(err, subProcesses) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(subProcesses);
      assert.lengthOf(subProcesses, 0);
      done(err);
    });
  });

  it('validate tasks of subProcesses', function callback(done) {
    testVars.subProcess.tasks({}, bootstrap.defaultContext, function callback(err, tasks) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(tasks);
      var expectedTasks = [{ 'name': 'TaskA', 'status': 'pending' },
        { 'name': 'TaskB', 'status': 'pending' }
      ];

      stateVerifier.verifyTasks(tasks, expectedTasks);
      testVars.tasks = tasks;
      done(err);
    });
  });

  it('validate parent processVariables', function callback() {
    stateVerifier.verifyProcessVariables(testVars.mainProcess._processVariables,
      testVars.subProcess._parentProcessVariables);
  });

  it('complete task 1', function callback(done) {
    testVars.tasks[0].completeTask({}, { 'taskA': 1 }, bootstrap.defaultContext, function callback(err) {
      if (err) {
        return done(err);
      }
      setTimeout(done, 2000);
    });
  });

  it('main process should have no change', function callback(done) {
    models.ProcessInstance.findById(testVars.mainProcess.id, bootstrap.defaultContext, function callback(err, instance) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(instance);
      assert.deepEqual(instance._processTokens, testVars.mainProcess._processTokens);
      assert.deepEqual(instance._processVariables, testVars.mainProcess._processVariables);
      assert.deepEqual(instance._status, testVars.mainProcess._status);
      done();
    });
  });

  it('complete task 2', function callback(done) {
    testVars.tasks[1].completeTask({}, { 'taskB': 2, 'mainProcessV': 'value from sub' }, bootstrap.defaultContext, function callback(err) {
      if (err) {
        return done(err);
      }
      setTimeout(done, 2000);
    });
  });

  it('validate subProcesses', function callback(done) {
    models.ProcessInstance.findById(testVars.subProcess.id, bootstrap.defaultContext, function callback(err, instance) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(instance);
      assert.equal(instance._status, 'complete');
      var expectedVariables = { 'taskA': 1, 'taskB': 2, 'mainProcessV': 'value from sub' };
      stateVerifier.verifyProcessVariables(instance._processVariables, expectedVariables);
      var expectedFlow = ['Start', 'Validate', 'TaskA', 'TaskB', 'End1', 'End2'];
      stateVerifier.verifyFlow(instance._processTokens, expectedFlow);
      done();
    });
  });

  it('validate main process', function callback(done) {
    models.ProcessInstance.findById(testVars.mainProcess.id, bootstrap.defaultContext, function callback(err, instance) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(instance);
      assert.equal(instance._status, 'complete');
      var expectedVariables = { 'taskA': 1, 'taskB': 2, 'mainProcessV': 'value from sub', 'mainProcessV2': 2 };
      stateVerifier.verifyProcessVariables(instance._processVariables, expectedVariables);
      var expectedFlow = ['Start', 'TaskA', 'Sub', 'End'];
      stateVerifier.verifyFlow(instance._processTokens, expectedFlow);
      done();
    });
  });
});
