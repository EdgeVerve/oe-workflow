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
  var name = 'subProcessBoundaryInterrupting';
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

  it('validate tasks of parentProcess', function callback(done) {
    testVars.mainProcess.tasks({}, bootstrap.defaultContext, function callback(err, tasks) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(tasks);
      var expectedTasks = [{ 'name': 'TaskB', 'status': 'pending' }];

      stateVerifier.verifyTasks(tasks, expectedTasks);
      testVars.tasks = tasks;
      done(err);
    });
  });

  it('complete task 1', function callback(done) {
    testVars.tasks[0].completeTask({}, { 'taskA': 1 }, bootstrap.defaultContext, function callback(err) {
      if (err) {
        return done(err);
      }
      setTimeout(done, 2000);
    });
  });

  it('validate tasks of subProcess', function callback(done) {
    testVars.subProcess.tasks({}, bootstrap.defaultContext, function callback(err, tasks) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(tasks);
      var expectedTasks = [{ 'name': 'TaskB', 'status': 'interrupted' }];
      stateVerifier.verifyTasks(tasks, expectedTasks);
      testVars.tasks = tasks;
      done(err);
    });
  });


  it('complete task 1', function callback(done) {
    testVars.tasks[0].completeTask({}, { 'taskA': 1 }, bootstrap.defaultContext, function callback(err) {
      if (err && err.message !== 'Task Already Completed') {
        return done(err);
      }
      done();
    });
  });

  it('validate subProcesses', function callback(done) {
    models.ProcessInstance.findById(testVars.subProcess.id, bootstrap.defaultContext, function callback(err, instance) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(instance);
      assert.equal(instance._status, 'interrupted');
      var expectedTokens = [
        { 'name': 'Start', 'status': 'complete' },
        { 'name': 'TaskB', 'status': 'interrupted' }
      ];
      stateVerifier.verifyTokens(instance._processTokens, expectedTokens);
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
      var expectedTokens = [
        { 'name': 'Start', 'status': 'complete' },
        { 'name': 'TaskA', 'status': 'complete' },
        { 'name': 'Sub', 'status': 'interrupted' },
        { 'name': 'TaskB', 'status': 'complete' },
        { 'name': 'Throw', 'status': 'complete' },
        { 'name': 'End2', 'status': 'complete' },
        { 'name': 'catch', 'status': 'complete' },
        { 'name': 'End3', 'status': 'complete' }
      ];
      stateVerifier.verifyTokens(instance._processTokens, expectedTokens);
      done();
    });
  });
});
