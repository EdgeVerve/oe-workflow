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

describe('Test case1 for Multi Instance Sequential', function callback() {
  this.timeout(20000);
  var name = 'SequentialMultiInstanceUserTask';
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
      if (bootstrap.checkDuplicateKeyError(err)) {
        done();
      } else {
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


  it('validate tasks of Process', function callback(done) {
    testVars.mainProcess.tasks({}, bootstrap.defaultContext, function callback(err, tasks) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(tasks);
      assert.lengthOf(tasks, 1);
      testVars.tasks = tasks;
      done(err);
    });
  });

  it('complete task 1', function callback(done) {
    testVars.tasks[0].completeTask({}, {}, bootstrap.defaultContext, done);
  });

  it('validate main process', function callback(done) {
    models.ProcessInstance.findById(testVars.mainProcess.id, bootstrap.defaultContext, function callback(err, instance) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(instance);
      var expectedTokens = [{
        'name': 'Start',
        'status': 'complete'
      }, {
        'name': 'TaskA',
        'status': 'pending',
        'nrOfCompleteInstances': 1
      }];
      stateVerifier.verifyTokens(instance._processTokens, expectedTokens);
      done();
    });
  });

  it('validate tasks of Process', function callback(done) {
    testVars.mainProcess.tasks({ 'where': { 'status': 'pending' } }, bootstrap.defaultContext, function callback(err, tasks) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(tasks);
      assert.lengthOf(tasks, 1);
      testVars.tasks = tasks;
      done(err);
    });
  });

  it('complete task 2', function callback(done) {
    testVars.tasks[0].completeTask({}, {}, bootstrap.defaultContext, done);
  });

  it('validate main process', function callback(done) {
    models.ProcessInstance.findById(testVars.mainProcess.id, bootstrap.defaultContext, function callback(err, instance) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(instance);
      var expectedTokens = [
        { 'name': 'Start', 'status': 'complete' },
        { 'name': 'TaskA', 'status': 'pending', 'nrOfCompleteInstances': 2 }
      ];
      stateVerifier.verifyTokens(instance._processTokens, expectedTokens);
      done();
    });
  });

  it('validate tasks of Process', function callback(done) {
    testVars.mainProcess.tasks({ 'where': { 'status': 'pending' } }, bootstrap.defaultContext, function callback(err, tasks) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(tasks);
      assert.lengthOf(tasks, 1);
      testVars.tasks = tasks;
      done(err);
    });
  });

  it('complete task 3', function callback(done) {
    testVars.tasks[0].completeTask({}, {}, bootstrap.defaultContext, function callback(err) {
      if (err) {
        return done(err);
      }
      setTimeout(done, 3000);
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
        { 'name': 'TaskA', 'status': 'complete', 'nrOfCompleteInstances': 3 },
        { 'name': 'End', 'status': 'complete' }
      ];
      stateVerifier.verifyTokens(instance._processTokens, expectedTokens);
      done();
    });
  });
});
