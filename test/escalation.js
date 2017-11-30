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

describe('Test case1 for escalation event', function cb() {
  this.timeout(30000);
  var name = 'escalationEvent1';
  var testVars = {};
  it('should read the file', function cb(done) {
    fs.readFile(path.resolve('./test/bpmn-files', name + '.bpmn'), 'utf8', (err, data) => {
      testVars.xmldata = data;
      done(err);
    });
  });

  it('deploy the WorkflowDefinition', function cb(done) {
    var defData = { 'name': name, 'xmldata': testVars.xmldata };
    models.WorkflowDefinition.create(defData, bootstrap.defaultContext, function cb(err) {
      // Code for duplicate keys
      if (bootstrap.checkDuplicateKeyError(err)) {
        done();
      } else {
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
      testVars.subProcess = subProcesses[0];
      done(err);
    });
  });

  it('validate tasks of subProcesses', function cb(done) {
    testVars.subProcess.tasks({}, bootstrap.defaultContext, function cb(err, tasks) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(tasks);
      var expectedTasks = [{
        'name': 'TaskB',
        'status': 'interrupted'
      }];
      stateVerifier.verifyTasks(tasks, expectedTasks);
      testVars.tasks = tasks;
      done();
    });
  });

  it('validate subProcesses', function cb(done) {
    models.ProcessInstance.findById(testVars.subProcess.id, bootstrap.defaultContext, function cb(err, instance) {
      if (err) {
        return done(err);
      }
      done();
    });
  });

  it('complete task B', function cb(done) {
    testVars.tasks[0].completeTask({}, { 'taskB': 1 }, bootstrap.defaultContext, function cb(err) {
      if (err && err.message !== 'Task Already Completed') {
        return done(err);
      }
      assert.isNotNull(err);
      setTimeout(done, 2000);
    });
  });

  it('validate subProcesses', function cb(done) {
    models.ProcessInstance.findById(testVars.subProcess.id, bootstrap.defaultContext, function cb(err, instance) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(instance);
      assert.equal(instance._status, 'interrupted');
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
