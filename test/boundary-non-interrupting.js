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

describe('Test case1 for boundary non-interrupting', function cb() {
  this.timeout(20000);
  var name = 'BoundaryNonInterrupting';
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


  it('validate tasks of Process', function cb(done) {
    testVars.mainProcess.tasks({}, bootstrap.defaultContext, function cb(err, tasks) {
      if (err) {
        return done(err);
      }
      log.debug(tasks);
      assert.isNotNull(tasks);
      var expectedTasks = [
        { 'name': 'TaskB', 'status': 'pending' },
        { 'name': 'TaskA', 'status': 'pending' }
      ];

      stateVerifier.verifyTasks(tasks, expectedTasks);
      testVars.tasks = tasks;
      done(err);
    });
  });

  it('complete task 1', function cb(done) {
    testVars.tasks[0].completeTask({}, {}, bootstrap.defaultContext, function cb(err, task) {
      if (err) {
        return done(err);
      }
      setTimeout(done, 1000);
    });
  });

  it('complete task 2', function cb(done) {
    testVars.tasks[1].completeTask({}, {}, bootstrap.defaultContext, function cb(err, task) {
      if (err) {
        return done(err);
      }
      setTimeout(done, 1000);
    });
  });


  it('validate main process', function cb(done) {
    models.ProcessInstance.findById(testVars.mainProcess.id, bootstrap.defaultContext, function cb(err, instance) {
      if (err) {
        return done(err);
      }
      log.debug(instance);
      assert.isNotNull(instance);
      assert.equal(instance._status, 'complete');
      var expectedFlow = ['Start', 'TaskD', 'TaskB', 'TaskA', 'boundaryMessage', 'end2', 'MessageThrow', 'End1'];
      stateVerifier.verifyFlow(instance._processTokens, expectedFlow);
      done();
    });
  });
});

describe('Test case2 for boundary non-interrupting', function cb() {
  this.timeout(30000);
  var name = 'BoundaryNonInterrupting';
  var testVars = {};

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


  it('validate tasks of Process', function cb(done) {
    testVars.mainProcess.tasks({}, bootstrap.defaultContext, function cb(err, tasks) {
      if (err) {
        return done(err);
      }

      assert.isNotNull(tasks);
      var expectedTasks = [
        { 'name': 'TaskB', 'status': 'pending' },
        { 'name': 'TaskA', 'status': 'pending' }
      ];

      stateVerifier.verifyTasks(tasks, expectedTasks);
      testVars.tasks = tasks;

      done(err);
    });
  });

  it('complete task 1', function cb(done) {
    testVars.tasks[1].completeTask({}, {}, bootstrap.defaultContext, function cb(err) {
      if (err) {
        return done(err);
      }
      setTimeout(done, 3000);
    });
  });

  it('complete task 2', function cb(done) {
    testVars.tasks[0].completeTask({}, {}, bootstrap.defaultContext, function cb(err) {
      if (err) {
        return done(err);
      }
      setTimeout(done, 3000);
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
        { 'name': 'TaskD', 'status': 'complete' },
        { 'name': 'TaskB', 'status': 'complete' },
        { 'name': 'TaskA', 'status': 'complete' },
        { 'name': 'MessageThrow', 'status': 'complete' },
        { 'name': 'End1', 'status': 'complete' },
        { 'name': 'boundaryMessage', 'status': 'complete' },
        { 'name': 'TaskC', 'status': 'complete' },
        { 'name': 'end3', 'status': 'complete' },
        { 'name': 'end2', 'status': 'complete' }
      ];
      stateVerifier.verifyTokens(instance._processTokens, expectedTokens);
      done();
    });
  });
});
