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

describe('Test case for User Task interruption on a bounday event', function callback() {
  this.timeout(10000);
  var name = 'UserTaskInterruptionBoundary';
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
      setTimeout(done, 3000);
    });
  });

  it('fetch process instance', function callback(done) {
    testVars.mainWorkflowInstance.processes({}, bootstrap.defaultContext, function callback(err, processes) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(processes);
      assert.lengthOf(processes, 1);
      testVars.process = processes[0];
      log.debug(testVars.process);
      setTimeout(done, 1000);
    });
  });

  it('fetch user task - user1', function callback(done) {
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

  it('fetch user task - user2', function callback(done) {
    testVars.process.tasks({}, User2Context, function callback(err, tasks) {
      if (err) {
        return done(err);
      }
      log.debug(tasks);
      assert.isNotNull(tasks);
      assert.lengthOf(tasks, 1);
      testVars.User2Task = tasks[0];
      done();
    });
  });

  it('complete user task - user1', function callback(done) {
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
      setTimeout(done, 3000);
    });
  });

  it('fetch process instance to verify states', function callback(done) {
    testVars.mainWorkflowInstance.processes({}, bootstrap.defaultContext, function callback(err, processes) {
      if (err) {
        return done(err);
      }
      log.debug(testVars.process);
      assert.isNotNull(processes);
      assert.lengthOf(processes, 1);
      done();
    });
  });

  it('fetch user task - user2 to verify interruption', function callback(done) {
    testVars.process.tasks({}, User2Context, function callback(err, tasks) {
      if (err) {
        return done(err);
      }
      log.debug(tasks);
      assert.isNotNull(tasks);
      assert.lengthOf(tasks, 1);
      var task = tasks[0];
      assert.strictEqual(task.status, 'interrupted');
      done();
    });
  });
});
