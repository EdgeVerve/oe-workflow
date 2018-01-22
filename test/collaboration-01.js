/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

var fs = require('fs');
var path = require('path');
var async = require('async');

var bootstrap = require('./bootstrap');
var chai = bootstrap.chai;
var assert = chai.assert;
var models = bootstrap.models;

var stateVerifier = require('./utils/stateverifier');

describe('Test case for collaboration1', function CB() {
  this.timeout(10000);
  var name = 'collaboration1';
  var testVars = {};
  it('should read the file', function CB(done) {
    fs.readFile(path.resolve('./test/bpmn-files', name + '.bpmn'), 'utf8', (err, data) => {
      testVars.xmldata = data;
      done(err);
    });
  });
  it('deploy the WorkflowDefinition', function CB(done) {
    var defData = { 'name': name, 'xmldata': testVars.xmldata };
    models.WorkflowDefinition.create(defData, bootstrap.defaultContext, function CB(err) {
      // Code for duplicate keys
      if (bootstrap.checkDuplicateKeyError(err))              {done();}          else {
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
      testVars.mainWorkflowInstance = instance;
      done();
    });
  });

  it('fetch process instance', function CB(done) {
    testVars.mainWorkflowInstance.processes({}, bootstrap.defaultContext, function CB(err, processes) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(processes);
      assert.lengthOf(processes, 2);
      testVars.processes = processes;
      setTimeout(done, 2000);
    });
  });

  it('validate tasks of workflow', function CB(done) {
    async.each(testVars.processes, function CB(process, callback) {
      process.tasks({}, bootstrap.defaultContext, function CB(err, tasks) {
        if (err) {
          return callback(err);
        }
        if (tasks.length !== 0) {
          testVars.tasks = tasks;
        }
        callback();
      });
    }, function CB(err) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(testVars.tasks);
      var expectedTasks = [{
        'name': 'TaskB',
        'status': 'pending'
      }];
      stateVerifier.verifyTasks(testVars.tasks, expectedTasks);
      done();
    });
  });


  it('complete task 1', function CB(done) {
    testVars.tasks[0].completeTask({}, { 'taskB': 1 }, bootstrap.defaultContext, function CB(err) {
      if (err) {
        return done(err);
      }
      setTimeout(done, 2000);
    });
  });

  it('validate 1st process', function CB(done) {
    models.ProcessInstance.findById(testVars.processes[0].id, bootstrap.defaultContext, function CB(err, instance) {
      if (err) {
        return done(err);
      }

      assert.isNotNull(instance);
      assert.equal(instance._status, 'complete');
      var expectedVariables = {};
      var expectedFlow = {};
      if (instance.processDefinitionName === 'collaboration1$process1') {
        expectedVariables = {};
        expectedVariables = {
          'mainProcessV': 'testValue',
          'mainProcessV2': 2
        };
        stateVerifier.verifyProcessVariables(instance._processVariables, expectedVariables);
        expectedFlow = {};
        expectedFlow = ['Start', 'TaskA', 'End'];
        stateVerifier.verifyFlow(instance._processTokens, expectedFlow);
        done();
      } else {
        expectedVariables = {};
        expectedVariables = {
          'taskB': 1,
          'mainProcessV': 'testValue',
          'mainProcessV2': 2
        };
        stateVerifier.verifyProcessVariables(instance._processVariables, expectedVariables);
        expectedFlow = {};
        expectedFlow = ['Start', 'TaskB', 'End'];
        stateVerifier.verifyFlow(instance._processTokens, expectedFlow);
        done();
      }
    });
  });

  it('validate 2nd process', function CB(done) {
    models.ProcessInstance.findById(testVars.processes[1].id, bootstrap.defaultContext, function CB(err, instance) {
      if (err) {
        return done(err);
      }

      assert.isNotNull(instance);
      assert.equal(instance._status, 'complete');
      var expectedVariables = {};
      var expectedFlow = {};
      if (instance.processDefinitionName === 'collaboration1$process1') {
        expectedVariables = {};
        expectedVariables = {
          'mainProcessV': 'testValue',
          'mainProcessV2': 2
        };
        stateVerifier.verifyProcessVariables(instance._processVariables, expectedVariables);
        expectedFlow = {};
        expectedFlow = ['Start', 'TaskA', 'End'];
        stateVerifier.verifyFlow(instance._processTokens, expectedFlow);
        done();
      } else {
        expectedVariables = {};
        expectedVariables = {
          'taskB': 1,
          'mainProcessV': 'testValue',
          'mainProcessV2': 2
        };
        stateVerifier.verifyProcessVariables(instance._processVariables, expectedVariables);
        expectedFlow = {};
        expectedFlow = ['Start', 'TaskB', 'End'];
        stateVerifier.verifyFlow(instance._processTokens, expectedFlow);
        done();
      }
    });
  });
});
