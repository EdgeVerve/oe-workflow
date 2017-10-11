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

describe('Test case for subprocess', function CB() {
  this.timeout(30000);
  var name = 'nestedSubProcInterrupting';
  var subProcessName = 'subProcess';
  var testVars = {};

  it('should read the file', function CB(done) {
    fs.readFile(path.resolve('./test/bpmn-files', name + '.bpmn'), 'utf8', (err, data) => {
      testVars.xmldata = data;
      done(err);
    });
  });

  it('should read the file - subProcess', function CB(done) {
    fs.readFile(path.resolve('./test/bpmn-files', subProcessName + '.bpmn'), 'utf8', (err, data) => {
      testVars.subPXmldata = data;
      done(err);
    });
  });

  it('deploy the subprocess WorkflowDefinition', function CB(done) {
    var defData = { 'name': 'subprocess', 'xmldata': testVars.subPXmldata };
    models.WorkflowDefinition.create(defData, bootstrap.defaultContext, function CB(err) {
      // Code for duplicate keys
      if (bootstrap.checkDuplicateKeyError(err))              {done();}          else {
        done(err);
      }
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
    var data = { 'workflowDefinitionName': name };
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
      done(err);
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
      testVars.subProcess1 = subProcesses[0];
      done(err);
    });
  });

  it('validate subProcess1 instance has one subprocess', function CB(done) {
    testVars.subProcess1.subProcesses({}, bootstrap.defaultContext, function CB(err, subProcesses) {
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

  it('validate subProcess2 has one subprocess', function CB(done) {
    testVars.subProcess2.subProcesses({}, bootstrap.defaultContext, function CB(err, subProcesses) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(subProcesses);
      assert.isArray(subProcesses);
      assert.lengthOf(subProcesses, 1);
      testVars.subProcess3 = subProcesses[0];
      done(err);
    });
  });


  it('validate tasks of parentProcess', function CB(done) {
    testVars.mainProcess.tasks({}, bootstrap.defaultContext, function CB(err, tasks) {
      assert.isNotNull(tasks);
      var expectedTasks = [{ 'name': 'TaskB', 'status': 'pending' }];

      stateVerifier.verifyTasks(tasks, expectedTasks);
      testVars.tasks = tasks;
      done(err);
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

  it('validate tasks of subProcess3', function CB(done) {
    testVars.subProcess3.tasks({}, bootstrap.defaultContext, function CB(err, tasks) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(tasks);
      var expectedTasks = [
        { 'name': 'TaskB', 'status': 'interrupted' },
        { 'name': 'TaskA', 'status': 'interrupted' }
      ];

      stateVerifier.verifyTasks(tasks, expectedTasks);
      testVars.tasks = tasks;
      done(err);
    });
  });
  it('complete task 1 of subProcess3', function CB(done) {
    testVars.tasks[0].completeTask({}, { 'taskA': 1 }, bootstrap.defaultContext, function CB(err) {
      if (err && err.message !== 'Task Already Completed') {
        return done(err);
      }
      done();
    });
  });

  it('validate tasks of subProcess1', function CB(done) {
    testVars.subProcess1.tasks({}, bootstrap.defaultContext, function CB(err, tasks) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(tasks);
      var expectedTasks = [];
      stateVerifier.verifyTasks(tasks, expectedTasks);
      testVars.tasks = tasks;
      done(err);
    });
  });

  it('validate subProcesses3', function CB(done) {
    models.ProcessInstance.findById(testVars.subProcess3.id, bootstrap.defaultContext, function CB(err, instance) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(instance);
      assert.equal(instance._status, 'interrupted');
      var expectedTokens = [
        { 'name': 'Start', 'status': 'complete' },
        { 'name': 'Validate', 'status': 'complete' },
        { 'name': 'TaskA', 'status': 'interrupted' },
        { 'name': 'TaskB', 'status': 'interrupted' }
      ];
      stateVerifier.verifyTokens(instance._processTokens, expectedTokens);
      done();
    });
  });

  it('validate subProcesses2', function CB(done) {
    models.ProcessInstance.findById(testVars.subProcess2.id, bootstrap.defaultContext, function CB(err, instance) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(instance);
      assert.equal(instance._status, 'interrupted');
      var expectedTokens = [
        { 'name': 'Start', 'status': 'complete' },
        { 'name': 'TaskA', 'status': 'complete' },
        { 'name': 'Sub', 'status': 'interrupted' }
      ];
      stateVerifier.verifyTokens(instance._processTokens, expectedTokens);
      done();
    });
  });

  it('validate subProcesses1', function CB(done) {
    models.ProcessInstance.findById(testVars.subProcess1.id, bootstrap.defaultContext, function CB(err, instance) {
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

  it('validate main process', function CB(done) {
    models.ProcessInstance.findById(testVars.mainProcess.id, bootstrap.defaultContext, function CB(err, instance) {
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
