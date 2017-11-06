var fs = require('fs');
var path = require('path');
var async = require('async');

var bootstrap = require('./bootstrap');
var chai = bootstrap.chai;
var assert = chai.assert;
var models = bootstrap.models;
var log = bootstrap.log();

var stateVerifier = require('./utils/stateverifier');
var User1Context = {
  ctx: {
    'tenantId': 'default',
    'remoteUser': 'user1',
    'username': 'user1'
  }
};
var User2Context = {
  ctx: {
    'tenantId': 'default',
    'remoteUser': 'user2',
    'username': 'user2'
  }
};
var User1Details = {
  'username': 'user1',
  'email': 'user1@oe.com',
  'password': 'user1',
  'id': 'user1'
};
var User2Details = {
  'username': 'user2',
  'email': 'user2@oe.com',
  'password': 'user2',
  'id': 'user2'
};

describe('User Creation', function callback() {
  this.timeout(10000);
  var BaseUser = models.BaseUser;

  it('should create user - user1', function callback(done) {
    BaseUser.create(User1Details, bootstrap.defaultContext, function callback(err, users) {
      if (bootstrap.checkDuplicateKeyError(err)) {
        log.debug(users);
        done();
      } else if (err) {
        log.error(err);
        return done(err);
      } else {
        log.debug(users);
        assert.isNotNull(users);
        done();
      }
    });
  });

  it('should create user - user2', function callback(done) {
    BaseUser.create(User2Details, bootstrap.defaultContext, function callback(err, users) {
      if (bootstrap.checkDuplicateKeyError(err)) {
        log.debug(users);
        done();
      } else if (err) {
        log.error(err);
        return done(err);
      } else {
        log.debug(users);
        assert.isNotNull(users);
        done();
      }
    });
  });
});


describe('Test case for Simple workflow definition versioning', function CB() {
  this.timeout(20000);
  var name = 'UserTask';
  var wfname1 = 'oneUserTask';
  var wfname2 = 'twoUserTasks';
  var testVars = {};
  var wfInstances = [];
  var wfprocesses = [];

  it('should read the file1', function CB(done) {
    fs.readFile(path.resolve('./test/bpmn-files', wfname1 + '.bpmn'), 'utf8', (err, data) => {
      testVars.xmldata = data;
      done(err);
    });
  });

  it('deploy the WorkflowDefinition1', function CB(done) {
    var defData = { 'name': name, 'xmldata': testVars.xmldata };
    models.WorkflowDefinition.create(defData, bootstrap.defaultContext, function CB(err) {
      // Code for duplicate keys
      if (err)              {done();}          else {
        setTimeout(done, 3000);
      }
    });
  });

  it('create workflow instance for old workflow defintion(One User Task BPMN)', function callback(done) {
    var processVariables = {};
    var data = { 'workflowDefinitionName': name, 'processVariables': processVariables };
    models.WorkflowInstance.create(data, bootstrap.defaultContext, function callback(err, instance) {
      if (err) {
        return done(err);
      }
      wfInstances.push(instance);
      setTimeout(done, 2000);
    });
  });

  it('should read the file2', function CB(done) {
    fs.readFile(path.resolve('./test/bpmn-files', wfname2 + '.bpmn'), 'utf8', (err, data) => {
      testVars.xmldata = data;
      done(err);
    });
  });

  it('deploy the WorkflowDefinition2 with same name', function CB(done) {
    var defData = { 'name': name, 'xmldata': testVars.xmldata };
    models.WorkflowDefinition.create(defData, bootstrap.defaultContext, function CB(err) {
      if (err)              {done(err);}          else {
        setTimeout(done, 2000);
      }
    });
  });

  it('Verify the latest workflowdefinition', function CB(done) {
    var filter = {'and': [{'name': name}, {'latest': true}]};
    models.WorkflowDefinition.find({'where': filter}, bootstrap.defaultContext, function CB(err, res) {
      if (err) {done(err);} else {
        assert(res.length, 1);
        done();
      }
    });
  });

  it('create workflow instance for latest workflow definition(Two User Tasks BPMN)', function callback(done) {
    var processVariables = {};
    var data = { 'workflowDefinitionName': name, 'processVariables': processVariables };
    models.WorkflowInstance.create(data, bootstrap.defaultContext, function callback(err, instance) {
      if (err) {
        return done(err);
      }
      wfInstances.push(instance);
      setTimeout(done, 2000);
    });
  });

  it('fetch process instance for old workflow definition(One User Task BPMN)', function callback(done) {
    var mainWorkflowInstance = wfInstances[0];
    mainWorkflowInstance.processes({}, bootstrap.defaultContext, function callback(err, processes) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(processes);
      assert.lengthOf(processes, 1);
      testVars.process = processes[0];
      wfprocesses.push(processes[0]);
      log.debug(testVars.process);
      setTimeout(done, 1000);
    });
  });

  it('fetch user task - user1[(One User Task BPMN)]', function callback(done) {
    testVars.process.tasks({}, User1Context, function callback(err, tasks) {
      if (err) {
        return done(err);
      }
      log.debug(tasks);
      assert.isNotNull(tasks);
      assert.lengthOf(tasks, 1);
      testVars.User1Task = tasks[0];
      done();
    });
  });

  it('complete user task - user1[(One User Task BPMN)]', function callback(done) {
    testVars.User1Task.complete({
      'pv': {
        'comments': 'task is complete'
      }
    }, User1Context, function callback(err, task) {
      if (err) {
        return done(err);
      }
      log.debug(task);
      assert.isNotNull(task);
      assert.strictEqual(task.status, 'complete');
      setTimeout(done, 2000);
    });
  });

  it('validate process1[(One User Task BPMN)]', function cb(done) {
    models.ProcessInstance.findById(wfprocesses[0].id, bootstrap.defaultContext, function cb(err, instance) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(instance);
      assert.equal(instance._status, 'complete');
      setTimeout(done, 1000);
    });
  });

  it('fetch process instance for latest workflow definition(Two User Tasks BPMN)', function callback(done) {
    var mainWorkflowInstance = wfInstances[1];
    mainWorkflowInstance.processes({}, bootstrap.defaultContext, function callback(err, processes) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(processes);
      assert.lengthOf(processes, 1);
      testVars.process = processes[0];
      wfprocesses.push(processes[0]);
      log.debug(testVars.process);
      setTimeout(done, 1000);
    });
  });

  it('fetch user task - user1[(Two User Tasks BPMN)]', function callback(done) {
    testVars.process.tasks({}, User1Context, function callback(err, tasks) {
      if (err) {
        return done(err);
      }
      log.debug(tasks);
      assert.isNotNull(tasks);
      assert.lengthOf(tasks, 1);
      testVars.User1Task = tasks[0];
      done();
    });
  });

  it('complete user task - user1[(Two User Tasks BPMN)]', function callback(done) {
    testVars.User1Task.complete({
      'pv': {
        'comments': 'task is complete'
      }
    }, User1Context, function callback(err, task) {
      if (err) {
        return done(err);
      }
      log.debug(task);
      assert.isNotNull(task);
      assert.strictEqual(task.status, 'complete');
      setTimeout(done, 1000);
    });
  });

  it('fetch user task - user2[(Two User Tasks BPMN)]', function callback(done) {
    testVars.process.tasks({}, User2Context, function callback(err, tasks) {
      if (err) {
        return done(err);
      }
      log.debug(tasks);
      assert.isNotNull(tasks);
      assert.lengthOf(tasks, 1);
      testVars.User2Task = tasks[0];
      setTimeout(done, 1000);
    });
  });

  it('complete user task - user2[(Two User Tasks BPMN)]', function callback(done) {
    testVars.User2Task.complete({
      'pv': {
        'comments': 'task is complete'
      }
    }, User2Context, function callback(err, task) {
      if (err) {
        return done(err);
      }
      log.debug(task);
      assert.isNotNull(task);
      assert.strictEqual(task.status, 'complete');
      setTimeout(done, 1000);
    });
  });

  it('validate process2[(Two User Tasks BPMN)]', function cb(done) {
    models.ProcessInstance.findById(wfprocesses[1].id, bootstrap.defaultContext, function cb(err, instance) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(instance);
      assert.equal(instance._status, 'complete');
      setTimeout(done, 1000);
    });
  });
});

describe('Test case for Collaborating workflow definitions versioning', function CB() {
  this.timeout(20000);
  var name = 'collaboration';
  var wfname1 = 'collaboration1';
  var wfname2 = 'collaboration2';

  var testVars = {};
  var participant2Name = 'process2';
  var wfInstances = [];


  it('should read the file[Collaboration 1]', function CB(done) {
    fs.readFile(path.resolve('./test/bpmn-files', wfname1 + '.bpmn'), 'utf8', (err, data) => {
      testVars.xmldata = data;
      done(err);
    });
  });
  it('deploy the WorkflowDefinition[Collaboration 1]', function CB(done) {
    var defData = { 'name': name, 'xmldata': testVars.xmldata };
    models.WorkflowDefinition.create(defData, bootstrap.defaultContext, function CB(err) {
              // Code for duplicate keys
      if (bootstrap.checkDuplicateKeyError(err))              {done();}          else {
        done(err);
      }
    });
  });

  it('create workflow instance[Collaboration 1]', function CB(done) {
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
      wfInstances.push(instance);
      done();
    });
  });

  it('should read the file[Collaboration 2]', function CB(done) {
    fs.readFile(path.resolve('./test/bpmn-files', wfname2 + '.bpmn'), 'utf8', (err, data) => {
      testVars.xmldata = data;
      done(err);
    });
  });

  it('should read the participant2 file: [Collaboration 2]', function CB(done) {
    fs.readFile(path.resolve('./test/bpmn-files', 'simpleTest' + '.bpmn'), 'utf8', (err, data) => {
      testVars.participant2 = data;
      done(err);
    });
  });

  it('deploy the participant2 WorkflowDefinition[Collaboration 2]', function CB(done) {
    var defData = { 'name': participant2Name, 'xmldata': testVars.participant2 };
    models.WorkflowDefinition.create(defData, bootstrap.defaultContext, function CB(err) {
      // Code for duplicate keys
      if (bootstrap.checkDuplicateKeyError(err)) {
        done();
      } else {
        done(err);
      }
    });
  });

  it('deploy the WorkflowDefinition [Collaboration 2]', function CB(done) {
    var defData = { 'name': name, 'xmldata': testVars.xmldata };
    models.WorkflowDefinition.create(defData, bootstrap.defaultContext, function CB(err) {
      // Code for duplicate keys
      if (bootstrap.checkDuplicateKeyError(err)) {
        done();
      } else {
        done(err);
      }
    });
  });

  it('create workflow instance [Collaboration 2]', function CB(done) {
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
      log.debug(instance);
      wfInstances.push(instance);
      setTimeout(done, 3000);
    });
  });

  it('fetch process instance[Collaboration 1]', function CB(done) {
    var mainWorkflowInstance = wfInstances[0];
    mainWorkflowInstance.processes({}, bootstrap.defaultContext, function CB(err, processes) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(processes);
      assert.lengthOf(processes, 2);
      testVars.processes = processes;
      setTimeout(done, 2000);
    });
  });


  it('validate tasks of workflow[Collaboration 1]', function CB(done) {
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


  it('complete task 1[Collaboration 1]', function CB(done) {
    testVars.tasks[0].completeTask({}, { 'taskB': 1 }, bootstrap.defaultContext, function CB(err) {
      if (err) {
        return done(err);
      }
      setTimeout(done, 2000);
    });
  });

  it('validate 1st process[Collaboration 1]', function CB(done) {
    models.ProcessInstance.findById(testVars.processes[0].id, bootstrap.defaultContext, function CB(err, instance) {
      if (err) {
        return done(err);
      }

      assert.isNotNull(instance);
      assert.equal(instance._status, 'complete');
      var expectedVariables = {};
      var expectedFlow = {};
      if (instance.processDefinitionName === 'collaboration$process1') {
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

  it('validate 2nd process[Collaboration 1]', function CB(done) {
    models.ProcessInstance.findById(testVars.processes[1].id, bootstrap.defaultContext, function CB(err, instance) {
      if (err) {
        return done(err);
      }

      assert.isNotNull(instance);
      assert.equal(instance._status, 'complete');
      var expectedVariables = {};
      var expectedFlow = {};
      if (instance.processDefinitionName === 'collaboration$process1') {
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

  it('fetch process instance[Collaboration 2]', function CB(done) {
    var mainWorkflowInstance = wfInstances[1];
    mainWorkflowInstance.processes({}, bootstrap.defaultContext, function CB(err, processes) {
      if (err) {
        return done(err);
      }
      log.debug(processes);
      assert.isNotNull(processes);
      assert.lengthOf(processes, 2);
      testVars.processes = processes;

      if (processes[0].toObject().processDefinitionName === 'process2') {
        testVars.process2 = processes[0];
        testVars.collab = processes[1];
      } else {
        testVars.process2 = processes[1];
        testVars.collab = processes[0];
      }

      setTimeout(done, 3000);
    });
  });

  it('validate tasks of workflow[Collaboration 2]', function cb(done) {
    testVars.process2.tasks({
      'where': {
        'name': 'TaskB'
      }
    }, bootstrap.defaultContext, function cb(err, tasks) {
      if (err) {
        return done(err);
      }
      testVars.tasks = tasks;
      log.debug(tasks);
      done();
    });
  });

  it('complete task 1 [Collaboration 2]', function CB(done) {
    testVars.tasks[0].completeTask({}, {
      'taskB': 1
    }, bootstrap.defaultContext, function cb(err, tasks) {
      if (err) {
        return done(err);
      }
      setTimeout(done, 2000);
    });
  });


  it('validate 1st process [Collaboration 2]', function CB(done) {
    models.ProcessInstance.findById(testVars.process2.id, bootstrap.defaultContext, function CB(err, instance) {
      if (err) {
        return done(err);
      }

      assert.isNotNull(instance);
      assert.equal(instance._status, 'complete');
      var expectedVariables = {};
      var expectedFlow = {};

      expectedVariables = {};
      expectedVariables = { 'taskB': 1, 'mainProcessV': 'testValue', 'mainProcessV2': 2 };
      stateVerifier.verifyProcessVariables(instance._processVariables, expectedVariables);
      expectedFlow = {};
      expectedFlow = ['Start', 'TaskB', 'End'];
      stateVerifier.verifyFlow(instance._processTokens, expectedFlow);
      done();
    });
  });

  it('validate 2nd process [Collaboration 2]', function CB(done) {
    models.ProcessInstance.findById(testVars.collab.id, bootstrap.defaultContext, function CB(err, instance) {
      if (err) {
        return done(err);
      }

      assert.isNotNull(instance);
      assert.equal(instance._status, 'complete');
      var expectedVariables = {};
      var expectedFlow = {};

      expectedVariables = {};
      expectedVariables = { 'mainProcessV': 'testValue', 'mainProcessV2': 2 };
      stateVerifier.verifyProcessVariables(instance._processVariables, expectedVariables);
      expectedFlow = {};
      expectedFlow = ['Start', 'TaskA', 'End'];
      stateVerifier.verifyFlow(instance._processTokens, expectedFlow);
      done();
    });
  });
});


