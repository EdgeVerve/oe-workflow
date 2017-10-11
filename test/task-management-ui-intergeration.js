/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

var fs = require('fs');
var path = require('path');
var request = require('request');

var bootstrap = require('./bootstrap');
var chai = bootstrap.chai;
var assert = chai.assert;
var models = bootstrap.models;

var stateVerifier = require('./utils/stateverifier');

var BaseUser = models.BaseUser;
var BaseRole = models.BaseRole;
var BaseRoleMapping = models.BaseRoleMapping;
var UserProfile = models.UserProfile;

var fromDate = '11/07/2014';
var toDate = '14/07/2014';
var comments = 'Going home for Diwali';
var ctxUser = {
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

  it('should create the role : admin', function callback(done) {
    BaseRole.create({
      name: 'admin',
      id: 'admin'
    }, bootstrap.defaultContext, function callback(err, role) {
      if (bootstrap.checkDuplicateKeyError(err)) {
        done();
      } else if (err) {
        return done(err);
      } else {
        assert.isNotNull(role);
        done();
      }
    });
  });

  it('should create the role mapping : user1 to admin', function callback(done) {
    BaseRoleMapping.findOrCreate({
      where: {
        principalType: 'USER',
        principalId: 'user1',
        roleId: 'admin'
      }
    }, { principalType: 'USER', principalId: 'user1', roleId: 'admin' }, bootstrap.defaultContext, function callback(err, roleMap) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(roleMap);
      done();
    });
  });

  it('should create the group mapping : user1 to workflow', function callback(done) {
    UserProfile.create({
      firstName: 'user1',
      lastName: 'lastname',
      department: 'workflow',
      userId: 'user1'
    }, bootstrap.defaultContext, function callback(err, profile) {
      if (bootstrap.checkDuplicateKeyError(err)) {
        done();
      } else if (err) {
        return done(err);
      } else {
        assert.isNotNull(profile);
        done();
      }
    });
  });
});

describe('Test case for taskManagement UI Integeration [ With Form formVariables ]', function callback() {
  this.timeout(15000);
  var name = 'task_oe_UI_new';
  var testVars = {};

  it('should login as user : user1', function callback(done) {
    BaseUser.login({
      username: 'user1',
      password: 'user1'
    }, bootstrap.defaultContext, function callback(err, token) {
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
    var data = {
      'workflowDefinitionName': name,
      'processVariables': {
        'fromDate': fromDate,
        'toDate': toDate,
        'comments': comments
      }
    };
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
    testVars.processes[0].tasks({}, ctxUser, function callback(err, tasks) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(tasks);
      assert.lengthOf(tasks, 1);
      var task = testVars.task = tasks[0];
      assert.strictEqual(task.formType, 'GenerateTaskForm');
      assert.isNotNull(task.formVariables);
      assert.strictEqual(task.formVariables.fromDate.defaultValue, fromDate);
      assert.strictEqual(task.formVariables.toDate.defaultValue, toDate);
      assert.strictEqual(task.formVariables.comments.defaultValue, comments);
      assert.isUndefined(task.formVariables._workflowInstanceId, 'WorkflowInstance is defined.');
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
      var expectedFlow = ['Start', 'UserTask[USERS]', 'End'];
      stateVerifier.verifyFlow(instance._processTokens, expectedFlow);
      setTimeout(done, 2000);
    });
  });
});

describe('Test case for taskManagement UI Integeration [ With Form formVariables ]', function callback() {
  this.timeout(15000);
  var name = 'task_oe_UI_wVars';
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
    var data = {
      'workflowDefinitionName': name,
      'processVariables': {
        'fromDate': fromDate,
        'toDate': toDate,
        'comments': comments
      }
    };
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
    testVars.processes[0].tasks({}, ctxUser, function callback(err, tasks) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(tasks);
      assert.lengthOf(tasks, 1);
      var task = testVars.task = tasks[0];
      assert.strictEqual(task.formKey, 'SimpleApprovalForm');
      assert.strictEqual(task.formType, 'embedded:app');
      assert.isNotNull(task.formVariables);
      assert.strictEqual(task.formVariables.fromDate, fromDate);
      assert.strictEqual(task.formVariables.toDate, toDate);
      assert.strictEqual(task.formVariables.comments, comments);
      assert.isUndefined(task.formVariables._workflowInstanceId, 'WorkflowInstance is defined.');
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
      var expectedFlow = ['Start', 'UserTask[USERS]', 'End'];
      stateVerifier.verifyFlow(instance._processTokens, expectedFlow);
      setTimeout(done, 2000);
    });
  });
});

describe('Test case for taskManagement UI Integeration [ Without Form formVariables ]', function callback() {
  this.timeout(10000);
  var name = 'task_oe_UI_woVars';
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
    var data = {
      'workflowDefinitionName': name,
      'processVariables': {
        'fromDate': fromDate,
        'toDate': toDate,
        'comments': comments
      }
    };
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
    testVars.processes[0].tasks({}, ctxUser, function callback(err, tasks) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(tasks);
      assert.lengthOf(tasks, 1);
      var task = testVars.task = tasks[0];
      assert.strictEqual(task.formKey, 'SimpleApprovalForm');
      assert.strictEqual(task.formType, 'embedded:app');
      assert.isNotNull(task.formVariables);
      assert.strictEqual(task.formVariables.fromDate, fromDate);
      assert.strictEqual(task.formVariables.toDate, toDate);
      assert.strictEqual(task.formVariables.comments, comments);
      assert.isNotNull(task.formVariables._workflowInstanceId);
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
      var expectedFlow = ['Start', 'UserTask[USERS]', 'End'];
      stateVerifier.verifyFlow(instance._processTokens, expectedFlow);
      setTimeout(done, 2000);
    });
  });
});
