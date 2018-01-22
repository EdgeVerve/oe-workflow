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

describe('Test case for pools1', function callback() {
  this.timeout(30000);
  var name = 'pools1';
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
      setTimeout(done, 2000);
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
        return done(err);
      }
      var expectedTasks = [{ 'name': 'TaskA', 'status': 'pending' }];
      stateVerifier.verifyTasks(tasks, expectedTasks);
      assert.equal(tasks[0].candidateUsers[0], 'default');
      testVars.tasks = tasks;
      done();
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


  it('validate tasks of processes', function callback(done) {
    testVars.mainProcess.tasks({}, bootstrap.defaultContext, function callback(err, tasks) {
      if (err) {
        return done(err);
      }
      var expectedTasks = [
        { 'name': 'TaskA', 'status': 'complete' },
        { 'name': 'TaskB', 'status': 'pending' }
      ];
      stateVerifier.verifyTasks(tasks, expectedTasks);
      assert.equal(tasks[1].candidateUsers[0], 'default');
      testVars.tasks = tasks;
      done();
    });
  });


  it('complete task 2', function callback(done) {
    testVars.tasks[1].completeTask({}, { 'taskB': 1 }, bootstrap.defaultContext, function callback(err) {
      if (err) {
        return done(err);
      }
      setTimeout(done, 2000);
    });
  });


  it('validate tasks of processes', function callback(done) {
    testVars.mainProcess.tasks({}, bootstrap.defaultContext, function callback(err, tasks) {
      if (err) {
        return done(err);
      }
      var expectedTasks = [
        { 'name': 'TaskA', 'status': 'complete' },
        { 'name': 'TaskB', 'status': 'complete' },
        { 'name': 'TaskC', 'status': 'pending' }
      ];

      stateVerifier.verifyTasks(tasks, expectedTasks);
      assert.equal(tasks[2].candidateUsers[0], 'default');
      testVars.tasks = tasks;

      done();
    });
  });


  it('complete task 2', function callback(done) {
    testVars.tasks[2].completeTask({}, { 'taskC': 1 }, bootstrap.defaultContext, function callback(err) {
      if (err) {
        return done(err);
      }
      setTimeout(done, 2000);
    });
  });

  it('validate tasks of processes', function callback(done) {
    testVars.mainProcess.tasks({}, bootstrap.defaultContext, function callback(err, tasks) {
      if (err) {
        return done(err);
      }
      var expectedTasks = [
        { 'name': 'TaskA', 'status': 'complete' },
        { 'name': 'TaskB', 'status': 'complete' },
        { 'name': 'TaskC', 'status': 'complete' },
        { 'name': 'TaskD', 'status': 'pending' }
      ];

      stateVerifier.verifyTasks(tasks, expectedTasks);
      assert.equal(tasks[3].candidateUsers[0], 'default');
      testVars.tasks = tasks;

      done();
    });
  });


  it('complete task 3', function callback(done) {
    testVars.tasks[3].completeTask({}, {}, bootstrap.defaultContext, function callback(err) {
      if (err) {
        return done(err);
      }
      setTimeout(done, 2000);
    });
  });


  it('validate 1st process', function callback(done) {
    models.ProcessInstance.findById(testVars.mainProcess.id, bootstrap.defaultContext, function callback(err, instance) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(instance);
      assert.equal(instance._status, 'complete');
      var expectedVariables = { 'taskA': 1, 'taskB': 1, 'taskC': 1 };
      stateVerifier.verifyProcessVariables(instance._processVariables, expectedVariables);
      var expectedFlow = ['Start', 'TaskA', 'TaskB', 'TaskC', 'TaskD', 'End'];
      stateVerifier.verifyFlow(instance._processTokens, expectedFlow);
      done();
    });
  });
});
