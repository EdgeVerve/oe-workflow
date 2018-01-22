var fs = require('fs');
var path = require('path');

var bootstrap = require('./bootstrap');
var chai = bootstrap.chai;
var assert = chai.assert;
var models = bootstrap.models;
var log = bootstrap.log();

var stateVerifier = require('./utils/state-verifier');

describe('Test case for Multi Instance Parallel - UserTask Parallel', function callback() {
  this.timeout(2000000);
  var name = 'PMIUserTaskCollection';
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
    var data = {
      'workflowDefinitionName': name,
      'processVariables': {
        'assignees': [
          'user1',
          'user2',
          'user3'
        ]
      }
    };
    models.WorkflowInstance.create(data, bootstrap.defaultContext, function callback(err, instance) {
      if (err) {
        return done(err);
      }
      testVars.mainWorkflowInstance = instance;
      setTimeout(done, 2000);
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
      log.debug(testVars.mainProcess);
      done();
    });
  });

  it('fetch and complete user task of User 1', function callback(done) {
    testVars.mainProcess.tasks({}, bootstrap.User1Context, function callback(err, tasks) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(tasks);
      assert.lengthOf(tasks, 1);
      var task = tasks[0];
      task.complete({
        'pv': {
          'input_by_user1': 123
        }
      }, bootstrap.User1Context, function cb(err, task) {
        if (err) {
          log.error(err);
          return done(err);
        }
        log.debug(task);
        done();
      });
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
      log.debug(testVars.mainProcess);
      done();
    });
  });

  it('fetch and complete user task of User 2', function callback(done) {
    testVars.mainProcess.tasks({}, bootstrap.User2Context, function callback(err, tasks) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(tasks);
      assert.lengthOf(tasks, 1);
      var task = tasks[0];
      task.complete({
        'pv': {
          'input_by_user2': 321
        }
      }, bootstrap.User1Context, function cb(err, task) {
        if (err) {
          log.error(err);
          return done(err);
        }
        log.debug(task);
        setTimeout(done, 2000);
      });
    });
  });

  it('validate main process', function callback(done) {
    models.ProcessInstance.findById(testVars.mainProcess.id, bootstrap.defaultContext, function callback(err, instance) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(instance);
      testVars.mainProcess = instance;
      log.debug(instance._processTokens);
      stateVerifier.isComplete(instance);
      stateVerifier.verifyTokens(instance, [{
        'name': 'Start',
        'status': 'complete'
      }, {
        'name': 'Multi-UserTask',
        'status': 'complete',
        'nrOfCompleteInstances': 2
      }, {
        'name': 'End',
        'status': 'complete'
      }]);
      stateVerifier.verifyPV(instance, {
        'input_by_user1': 123,
        'input_by_user2': 321
      });
      done();
    });
  });

  it('validate interrupted task due to completion condition', function callback(done) {
    var _options = JSON.parse(JSON.stringify(bootstrap.defaultContext));
    _options._skip_tf = true;
    testVars.mainProcess.tasks({
      where: {
        status: 'interrupted'
      }
    }, _options, function callback(err, tasks) {
      if (err) {
        return done(err);
      }
      log.debug(tasks);
      assert.isNotNull(tasks);
      assert.strictEqual(tasks.length, 1);
      var task = tasks[0];
      assert.isNotNull(task.candidateUsers);
      assert.strictEqual(task.candidateUsers.length, 1);
      assert.strictEqual(task.candidateUsers[0], 'user3');
      done();
    });
  });
});

describe('Test case for Multi Instance Parallel with Call Activity', function callback() {
  this.timeout(2000000);
  var name = 'PMIParentCollection';
  var callActivityName = 'PMIChildWorkflow';
  var testVars = {};

  it('should read the file', function callback(done) {
    fs.readFile(path.resolve('./test/bpmn-files', name + '.bpmn'), 'utf8', (err, data) => {
      testVars.xmldata = data;
      done(err);
    });
  });

  it('should read the file', function callback(done) {
    fs.readFile(path.resolve('./test/bpmn-files', callActivityName + '.bpmn'), 'utf8', (err, data) => {
      testVars.callActivityXML = data;
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

  it('deploy the CallActivity WorkflowDefinition', function callback(done) {
    var defData = { 'name': callActivityName, 'xmldata': testVars.callActivityXML };
    models.WorkflowDefinition.create(defData, bootstrap.defaultContext, function callback(err, defn) {
      // Code for duplicate keys
      if (bootstrap.checkDuplicateKeyError(err)) {
        done();
      } else {
        done(err);
      }
    });
  });

  it('create workflow instance ', function callback(done) {
    var data = {
      'workflowDefinitionName': name,
      'processVariables': {
        'managerDetails': [{
          'name': 'user1',
          'type': 'SeniorManager'
        }, {
          'name': 'user2',
          'type': 'JuniorManager'
        }, {
          'name': 'user3',
          'type': 'Manager'
        }]
      }
    };
    models.WorkflowInstance.create(data, bootstrap.defaultContext, function callback(err, instance) {
      if (err) {
        return done(err);
      }
      testVars.mainWorkflowInstance = instance;
      setTimeout(done, 2000);
    });
  });

  it('fetch process instance', function callback(done) {
    testVars.mainWorkflowInstance.processes({
      'where': {
        'processDefinitionName': name
      },
      'include': 'subProcesses'
    }, bootstrap.defaultContext, function callback(err, instances) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(instances);
      assert.lengthOf(instances, 1);
      testVars.mainProcess = instances[0];
      log.debug(testVars.mainProcess);
      done();
    });
  });

  it('fetch and complete user task of User 1', function callback(done) {
    // both tasks are under mainWorkflowInstance
    testVars.mainWorkflowInstance.tasks({}, bootstrap.User1Context, function callback(err, tasks) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(tasks);
      assert.lengthOf(tasks, 1);
      var task = tasks[0];
      task.complete({
        'pv': {
          'input_by_user1': 123
        }
      }, bootstrap.User1Context, function cb(err, task) {
        if (err) {
          log.error(err);
          return done(err);
        }
        log.debug(task);
        done();
      });
    });
  });

  it('fetch process instance', function callback(done) {
    testVars.mainWorkflowInstance.processes({
      'where': {
        'processDefinitionName': name
      },
      'include': 'subProcesses'
    }, bootstrap.defaultContext, function callback(err, instance) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(instance);
      assert.lengthOf(instance, 1);
      testVars.mainProcess = instance[0];
      log.debug(testVars.mainProcess);
      done();
    });
  });

  it('fetch and complete user task of User 2', function callback(done) {
    testVars.mainWorkflowInstance.tasks({}, bootstrap.User2Context, function callback(err, tasks) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(tasks);
      assert.lengthOf(tasks, 1);
      var task = tasks[0];
      task.complete({
        'pv': {
          'input_by_user2': 321
        }
      }, bootstrap.User1Context, function cb(err, task) {
        if (err) {
          log.error(err);
          return done(err);
        }
        log.debug(task);
        setTimeout(done, 2000);
      });
    });
  });

  it('validate main process', function callback(done) {
    models.ProcessInstance.findById(testVars.mainProcess.id, bootstrap.defaultContext, function callback(err, instance) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(instance);
      log.debug(instance._processTokens);
      stateVerifier.isComplete(instance);
      stateVerifier.verifyTokens(instance, [{
        'name': 'Start',
        'status': 'complete'
      }, {
        'name': 'CallChild',
        'status': 'complete',
        'nrOfCompleteInstances': 2
      }, {
        'name': 'End',
        'status': 'complete'
      }]);
      stateVerifier.verifyPV(instance, {
        'input_by_user1': 123,
        'input_by_user2': 321
      });
      done();
    });
  });
});

describe('Test case for Multi Instance Parallel - UserTask Parallel w/ Loop Cardinality', function callback() {
  this.timeout(2000000);
  var name = 'PMIUserTaskLoopCardinality';
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
    var data = {
      'workflowDefinitionName': name,
      'processVariables': {
        'num_of_tasks': 4
      }
    };
    models.WorkflowInstance.create(data, bootstrap.defaultContext, function callback(err, instance) {
      if (err) {
        return done(err);
      }
      testVars.mainWorkflowInstance = instance;
      setTimeout(done, 2000);
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
      log.debug(testVars.mainProcess);
      done();
    });
  });

  it('fetch and complete user task of User 1', function callback(done) {
    testVars.mainProcess.tasks({
      where: {
        status: 'pending'
      }
    }, bootstrap.User1Context, function callback(err, tasks) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(tasks);
      assert.lengthOf(tasks, 4);
      var task = tasks[0];
      task.complete({
        'pv': {
          'input_by_user1_1': 123
        }
      }, bootstrap.User1Context, function cb(err, task) {
        if (err) {
          log.error(err);
          return done(err);
        }
        log.debug(task);
        done();
      });
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
      log.debug(testVars.mainProcess);
      done();
    });
  });

  it('fetch and complete another user task of User 1', function callback(done) {
    testVars.mainProcess.tasks({
      where: {
        status: 'pending'
      }
    }, bootstrap.User1Context, function callback(err, tasks) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(tasks);
      assert.lengthOf(tasks, 3);
      var task = tasks[0];
      task.complete({
        'pv': {
          'input_by_user1_2': 321
        }
      }, bootstrap.User1Context, function cb(err, task) {
        if (err) {
          log.error(err);
          return done(err);
        }
        log.debug(task);
        setTimeout(done, 2000);
      });
    });
  });

  it('validate main process', function callback(done) {
    models.ProcessInstance.findById(testVars.mainProcess.id, bootstrap.defaultContext, function callback(err, instance) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(instance);
      testVars.mainProcess = instance;
      log.debug(instance._processTokens);
      stateVerifier.isComplete(instance);
      stateVerifier.verifyTokens(instance, [{
        'name': 'Start',
        'status': 'complete'
      }, {
        'name': 'Multi-UserTask',
        'status': 'complete',
        'nrOfCompleteInstances': 2
      }, {
        'name': 'End',
        'status': 'complete'
      }]);
      stateVerifier.verifyPV(instance, {
        'input_by_user1_1': 123,
        'input_by_user1_2': 321
      });
      done();
    });
  });

  it('validate interrupted task due to completion condition', function callback(done) {
    var _options = JSON.parse(JSON.stringify(bootstrap.defaultContext));
    _options._skip_tf = true;
    testVars.mainProcess.tasks({
      where: {
        status: 'interrupted'
      }
    }, _options, function callback(err, tasks) {
      if (err) {
        return done(err);
      }
      log.debug(tasks);
      assert.isNotNull(tasks);
      assert.strictEqual(tasks.length, 2);
      var task = tasks[0];
      assert.isNotNull(task.candidateUsers);
      assert.strictEqual(task.candidateUsers.length, 1);
      assert.strictEqual(task.candidateUsers[0], 'user1');
      done();
    });
  });
});
