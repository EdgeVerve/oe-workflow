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
  var name = 'callActivity';
  var callActivityName = 'subProcess';
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
    var defData = { 'name': 'childProcess', 'xmldata': testVars.callActivityData };
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
    var processVariables = { 'mainProcessV': 'testValue', 'mainProcessV2': 2 };
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


  it('validate subprocess has one more subprocess', function CB(done) {
    testVars.subProcess.subProcesses({}, bootstrap.defaultContext, function CB(err, subProcesses) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(subProcesses);
      assert.isArray(subProcesses);
      assert.lengthOf(subProcesses, 1);
      testVars.subProcess2 = subProcesses[0];
      done();
    });
  });

  it('validate parent of 2nd subProcess instance', function CB(done) {
    testVars.subProcess2.parentProcess({}, bootstrap.defaultContext, function CB(err, instance) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(instance);
      assert.deepEqual(testVars.subProcess.id, instance.id);
      done();
    });
  });


  it('validate tasks of 2nd subProcesses', function CB(done) {
    testVars.subProcess2.tasks({}, bootstrap.defaultContext, function CB(err, tasks) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(tasks);
      var expectedTasks = [
        { 'name': 'TaskA', 'status': 'pending' },
        { 'name': 'TaskB', 'status': 'pending' }
      ];

      stateVerifier.verifyTasks(tasks, expectedTasks);
      testVars.tasks = tasks;
      done();
    });
  });

  it('complete task 1', function CB(done) {
    testVars.tasks[0].completeTask({}, { 'taskA': 1 }, bootstrap.defaultContext, function CB(err) {
      if (err) {
        return done(err);
      }
      setTimeout(done, 2000);
    });
  });

  it('main process should have no change', function CB(done) {
    models.ProcessInstance.findById(testVars.mainProcess.id, bootstrap.defaultContext, function CB(err, instance) {
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

  it('complete task 2', function CB(done) {
    testVars.tasks[1].completeTask({}, { 'taskB': 2, 'mainProcessV': 'value from sub' }, bootstrap.defaultContext, function CB(err) {
      if (err) {
        return done(err);
      }
      setTimeout(done, 2000);
    });
  });

  it('validate 2nd subProcesses', function CB(done) {
    models.ProcessInstance.findById(testVars.subProcess2.id, bootstrap.defaultContext, function CB(err, instance) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(instance);
      assert.equal(instance._status, 'complete');
      var expectedVariables = {
        'taskA': 1,
        'taskB': 2,
        'mainProcessV': 'value from sub'
      };
      stateVerifier.verifyProcessVariables(instance._processVariables, expectedVariables);
      var expectedFlow = ['Start', 'Validate', 'TaskA', 'TaskB', 'End1', 'End2'];
      stateVerifier.verifyFlow(instance._processTokens, expectedFlow);
      done();
    });
  });

  it('validate subProcess process', function CB(done) {
    models.ProcessInstance.findById(testVars.subProcess.id, bootstrap.defaultContext, function CB(err, instance) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(instance);
      assert.equal(instance._status, 'complete');
      var expectedVariables = {
        'taskA': 1,
        'taskB': 2,
        'mainProcessV': 'value from sub'
      };
      stateVerifier.verifyProcessVariables(instance._processVariables, expectedVariables);
      var expectedFlow = ['Start', 'TaskA', 'Sub', 'End'];
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
        'taskA': 1,
        'taskB': 2,
        'mainProcessV': 'value from sub',
        'mainProcessV2': 2
      };
      stateVerifier.verifyProcessVariables(instance._processVariables, expectedVariables);
      var expectedFlow = ['Start', 'TaskA', 'test', 'End'];
      stateVerifier.verifyFlow(instance._processTokens, expectedFlow);
      done();
    });
  });
});
