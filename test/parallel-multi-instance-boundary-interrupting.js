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

describe('Test case1 for Multi Instance Parallel subProcess', function callback() {
  this.timeout(30000);
  var name = 'ParallelMultiInstanceBoundaryInterrupting';
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

  it('validate main instance has subprocesses', function callback(done) {
    testVars.mainProcess.subProcesses({}, bootstrap.defaultContext, function callback(err, subProcesses) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(subProcesses);
      assert.isArray(subProcesses);
      assert.lengthOf(subProcesses, 3);
      testVars.subProcess = subProcesses;
      done(err);
    });
  });

  it('validate tasks of  subProcesses 1', function callback(done) {
    testVars.subProcess[0].tasks({}, bootstrap.defaultContext, function callback(err, tasks) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(tasks);
      var expectedTasks = [{ 'name': 'TaskA', 'status': 'pending' }];
      stateVerifier.verifyTasks(tasks, expectedTasks);
      testVars.tasks = tasks;
      done(err);
    });
  });
/*    it('complete task 1 of sub process 1', function(done) {
        testVars.tasks[0].completeTask({}, {}, bootstrap.defaultContext, function(err) {
            if (err) {
                return done(err);
            }
            setTimeout(done, 2000);
        });
    });

    it('validate subProcesses 1', function(done) {
        models.ProcessInstance.findById(testVars.subProcess[0].id, bootstrap.defaultContext, function(err, instance) {
            if (err) {
                return done(err);
            }
            assert.isNotNull(instance);
            assert.equal(instance._status, "complete");
            var expectedFlow = ["Start", "TaskA", "End"];
            stateVerifier.verifyFlow(instance._processTokens, expectedFlow);
            done();
        });
    });

    it('validate main process', function(done) {
        models.ProcessInstance.findById(testVars.mainProcess.id, bootstrap.defaultContext, function(err, instance) {
            if (err) {
                return done(err);
            }
            assert.isNotNull(instance);
            testVars.tasks = testVars.mainProcess.tasks;
            var expectedTokens = [
                { "name": "Start", "status": "complete" },
                { "name": "Par", "status": "complete" },
                { "name": "subP", "status": "pending", "nrOfCompleteInstances": 1 },
                { "name": "TaskA", "status": "pending" }
            ];
            stateVerifier.verifyTokens(instance._processTokens, expectedTokens);
            done();
        });

    });

    it('validate tasks of subProcesses 2', function(done) {
        testVars.subProcess[1].tasks({}, bootstrap.defaultContext, function(err, tasks) {
            if (err) {
                return done(err);
            }
            assert.isNotNull(tasks);
            var expectedTasks = [{ "name": "TaskA", "status": "pending" }];
            stateVerifier.verifyTasks(tasks, expectedTasks);
            testVars.tasks = tasks;
            done(err)
        });
    });

    it('complete task 1 of sub process 2', function(done) {
        testVars.tasks[0].completeTask({}, {}, bootstrap.defaultContext, function(err) {
            if (err) {
                return done(err);
            }
            setTimeout(done, 5000);
        });
    });

    it('validate subProcesses 2', function(done) {
        models.ProcessInstance.findById(testVars.subProcess[1].id, bootstrap.defaultContext, function(err, instance) {
            if (err) {
                return done(err);
            }
            assert.isNotNull(instance);
            assert.equal(instance._status, "complete");
            var expectedFlow = ["Start", "TaskA", "End"];
            stateVerifier.verifyFlow(instance._processTokens, expectedFlow);
            done();
        });
    });
    it('validate main process', function(done) {
        models.ProcessInstance.findById(testVars.mainProcess.id, bootstrap.defaultContext, function(err, instance) {
            if (err) {
                return done(err);
            }
            assert.isNotNull(instance);
            var expectedTokens = [
                { "name": "Start", "status": "complete" },
                { "name": "TaskA", "status": "pending", "nrOfCompleteInstances": 2 }
            ];
            stateVerifier.verifyTokens(instance._processTokens, expectedTokens);
            done();
        });

    });

    it('validate tasks of subProcesses 3', function(done) {
        testVars.subProcess[2].tasks({}, bootstrap.defaultContext, function(err, tasks) {
            if (err) {
                return done(err);
            }
            assert.isNotNull(tasks);
            var expectedTasks = [{ "name": "TaskA", "status": "pending" }];
            stateVerifier.verifyTasks(tasks, expectedTasks);
            testVars.tasks = tasks;
            done(err)
        });
    });

    it('complete task 1 of sub process 3', function(done) {
        testVars.tasks[0].completeTask({}, {}, bootstrap.defaultContext, function(err) {
            if(err){
            	return done(err);
            }
            setTimeout(done, 7000)
        });
    });

    it('validate subProcesses 3', function(done) {
        models.ProcessInstance.findById(testVars.subProcess[2].id, bootstrap.defaultContext, function(err, instance) {
            if(err){
            	return done(err);
            }
            assert.isNotNull(instance);
            assert.equal(instance._status, "complete");
            var expectedFlow = ["Start", "TaskA", "End"];
            stateVerifier.verifyFlow(instance._processTokens, expectedFlow);
            done();
        });
    });


    it('validate main process', function(done) {
        models.ProcessInstance.findById(testVars.mainProcess.id, bootstrap.defaultContext, function(err, instance) {
            if(err){
            	return done(err);
            }
            assert.isNotNull(instance);
            assert.equal(instance._status, "complete");
            var expectedTokens = [
                { "name": "Start", "status": "complete" },
                { "name": "TaskA", "status": "complete", "nrOfCompleteInstances": 3 },
                { "name": "End", "status": "complete" }
            ];
            stateVerifier.verifyTokens(instance._processTokens, expectedTokens);
            done();
        });

    });
*/
});
