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

describe('Test case for pools2', function callback() {
  this.timeout(20000);
  var name = 'pools2';
  var testVars = {};
  it('should read the file', function callback(done) {
    fs.readFile(path.resolve('./test/bpmn-files', name + '.bpmn'), 'utf8', (err, data) => {
      testVars.xmldata = data;
      done(err);
    });
  });
  it('deploy the WorkflowDefinition', function callback(done) {
    var defData = {'name': name, 'xmldata': testVars.xmldata};
    models.WorkflowDefinition.create(defData, bootstrap.defaultContext, function callback(err) {
      // Code for duplicate keys
      if (bootstrap.checkDuplicateKeyError(err))  {done();}  else {
        done(err);
      }
    });
  });

  it('create workflow instance ', function callback(done) {
    var data = {'workflowDefinitionName': name};
    models.WorkflowInstance.create(data, bootstrap.defaultContext, function callback(err, instance) {
      if (err) {
        return done(err);
      }
      testVars.mainWorkflowInstance = instance;
      done();
    });
  });

  it('fetch process instance', function callback(done) {
    testVars.mainWorkflowInstance.processes({}, bootstrap.defaultContext, function callback(err, processes) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(processes);
      assert.lengthOf(processes, 1);
      testVars.mainProcess = processes[0];
      setTimeout(done, 2000);
    });
  });

  it('validate tasks of processes', function callback(done) {
    testVars.mainProcess.tasks({}, bootstrap.defaultContext, function callback(err, tasks) {
      if (err) {
        return callback(err);
      }
      var expectedTasks = [{'name': 'TaskA', 'status': 'pending'}];
      stateVerifier.verifyTasks(tasks, expectedTasks);
      assert.equal(tasks[0].candidateUsers[0], 'default');
      testVars.tasks = tasks;
      done();
    });
  });


  it('complete task 1', function callback(done) {
    testVars.tasks[0].completeTask({}, {'taskA': 1}, bootstrap.defaultContext, function callback(err) {
      if (err) {
        return done(err);
      }
      setTimeout(done, 3000);
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
      assert.equal(testVars.subProcess._poolInfo, 'admin');
      done(err);
    });
  });


  it('validate tasks of suprocesses', function callback(done) {
    testVars.subProcess.tasks({}, bootstrap.defaultContext, function callback(err, tasks) {
      if (err) {
        return callback(err);
      }
      var expectedTasks = [{'name': 'TaskA', 'status': 'pending'}];

      stateVerifier.verifyTasks(tasks, expectedTasks);
      assert.equal(tasks[0].candidateUsers[0], 'default');
      testVars.tasks = tasks;
      done();
    });
  });

  it('complete task 1', function callback(done) {
    testVars.tasks[0].completeTask({}, {'taskA': 1}, bootstrap.defaultContext, function callback(err) {
      if (err) {
        return done(err);
      }
      setTimeout(done, 2000);
    });
  });

  it('validate subProcess process', function callback(done) {
    models.ProcessInstance.findById(testVars.subProcess.id, bootstrap.defaultContext, function callback(err, instance) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(instance);
      assert.equal(instance._status, 'complete');
      var expectedVariables = {'taskA': 1};
      stateVerifier.verifyProcessVariables(instance._processVariables, expectedVariables);
      var expectedFlow = ['Start', 'TaskA', 'End'];
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
      var expectedVariables = {'taskA': 1};
      stateVerifier.verifyProcessVariables(instance._processVariables, expectedVariables);
      var expectedFlow = ['Start', 'TaskA', 'TaskB', 'End'];
      stateVerifier.verifyFlow(instance._processTokens, expectedFlow);
      done();
    });
  });
});
