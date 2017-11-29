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
chai.use(require('chai-datetime'));
var models = bootstrap.models;
var request = require('request');
var stateVerifier = require('./utils/stateverifier');

var BaseUser = models.BaseUser;
var BaseRole = models.BaseRole;
var BaseRoleMapping = models.BaseRoleMapping;
var UserProfile = models.UserProfile;

var ctxUser1 = {
  ctx: {
    'tenantId': 'default',
    'remoteUser': 'user1',
    'username': 'user1',
    'roles': [
      'admin'
    ],
    'department': 'workflow'
  }
};
var ctxUser2 = {
  ctx: {
    'tenantId': 'default',
    'remoteUser': 'user2',
    'username': 'user2',
    'roles': [
      'admin'
    ],
    'department': 'workflow'
  }
};
describe('Test case for taskManagement [ Init ]', function callback() {
  this.timeout(10000);
  it('should create the user : user1', function callback(done) {
    BaseUser.create({ username: 'user1', email: 'user1@oe.com', password: 'user1', id: 'user1' }, bootstrap.defaultContext, function callback(err, users) {
      if (bootstrap.checkDuplicateKeyError(err)) {
        done();
      } else if (err) {
        return done(err);
      } else {
        assert.isNotNull(users);
        done();
      }
    });
  });

  it('should create the user : user2', function callback(done) {
    BaseUser.create({ username: 'user2', email: 'user2@oe.com', password: 'user2', id: 'user2' }, bootstrap.defaultContext, function callback(err, users) {
      if (bootstrap.checkDuplicateKeyError(err)) {
        done();
      } else if (err) {
        return done(err);
      } else {
        assert.isNotNull(users);
        done();
      }
    });
  });
});

describe('Test case for taskManagement [ Authorized User ]', function callback() {
  this.timeout(10000);
  var name = 'task_dates_md';
  var testVars = {};

  it('should login as user : user1', function callback(done) {
    BaseUser.login({ username: 'user1', password: 'user1' }, bootstrap.defaultContext, function callback(err, token) {
      if (bootstrap.checkDuplicateKeyError(err)) {
        done();
      } else if (err) {
        return done(err);
      } else {
        assert.isNotNull(token);
        testVars.accessToken = token;
        done();
      }
    });
  });

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
      if (bootstrap.checkDuplicateKeyError(err))        {done();}      else {
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
      testVars.processes = instance;
      setTimeout(done, 2000);
    });
  });


  it('fetch task instance', function callback(done) {
    testVars.processes[0].tasks({}, ctxUser1, function callback(err, task) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(task);
      assert.lengthOf(task, 1);
      testVars.task = task[0];
      var today = new Date();
      today.setUTCDate(today.getUTCDate() + 15); // 15 days
      assert.equalDate(today, task[0].dueDate);
      today = new Date();
      today.setUTCMonth(today.getUTCMonth() + 2); // 2 months
      assert.equalDate(today, task[0].followUpDate);
      setTimeout(done, 2000);
    });
  });


  it('try to complete task', function callback(done) {
    var putURL = 'http://localhost:3000/api/Tasks/' + testVars.task.id + '/completeTask?access_token=' + testVars.accessToken.id;
    request({ url: putURL, method: 'PUT', json: {} }, cb);

    function cb(err, response) {
      if (err) {
        done(err);
      }

      assert.strictEqual(response.statusCode, 200);
      setTimeout(done, 2000);
    }
  });


  it('validate process', function callback(done) {
    models.ProcessInstance.findById(testVars.processes[0].id, bootstrap.defaultContext, function callback(err, instance) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(instance);
      assert.equal(instance._status, 'complete');
      var expectedFlow = ['Start', 'UserTask [user1]', 'End'];
      stateVerifier.verifyFlow(instance._processTokens, expectedFlow);
      setTimeout(done, 2000);
    });
  });
});


describe('Test case for taskManagement [ Authorized User ]', function callback() {
  this.timeout(10000);
  var name = 'task_dates_dts';
  var testVars = {};

  it('should login as user : user2', function callback(done) {
    BaseUser.login({ username: 'user2', password: 'user2' }, bootstrap.defaultContext, function callback(err, token) {
      if (bootstrap.checkDuplicateKeyError(err)) {
        done();
      } else if (err) {
        return done(err);
      } else {
        assert.isNotNull(token);
        testVars.accessToken = token;
        done();
      }
    });
  });

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
      if (bootstrap.checkDuplicateKeyError(err))        {done();}      else {
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
      testVars.processes = instance;
      setTimeout(done, 2000);
    });
  });


  it('fetch task instance', function callback(done) {
    testVars.processes[0].tasks({}, ctxUser2, function callback(err, task) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(task);
      assert.lengthOf(task, 1);
      testVars.task = task[0];
      var today = new Date();
      assert.equalDate(today, task[0].dueDate);
      today.setUTCDate(today.getUTCDate() + 1) // tomorrow
      assert.equalDate(today, task[0].followUpDate);
      assert.strictEqual(task[0].priority, "3");
      setTimeout(done, 2000);
    });
  });


  it('try to complete task', function callback(done) {
    var putURL = 'http://localhost:3000/api/Tasks/' + testVars.task.id + '/completeTask?access_token=' + testVars.accessToken.id;
    request({ url: putURL, method: 'PUT', json: {} }, cb);

    function cb(err, response) {
      if (err) {
        done(err);
      }

      assert.strictEqual(response.statusCode, 200);
      setTimeout(done, 2000);
    }
  });


  it('validate process', function callback(done) {
    models.ProcessInstance.findById(testVars.processes[0].id, bootstrap.defaultContext, function callback(err, instance) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(instance);
      assert.equal(instance._status, 'complete');
      var expectedFlow = ['Start', 'UserTask [user2]', 'End'];
      stateVerifier.verifyFlow(instance._processTokens, expectedFlow);
      setTimeout(done, 2000);
    });
  });
});
