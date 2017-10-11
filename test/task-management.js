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
      'manager'
    ],
    'department': 'workflow'
  }
};
var ctxUser3 = {
  ctx: {
    'tenantId': 'default',
    'remoteUser': 'user3',
    'username': 'user3',
    'roles': [
      'manager'
    ],
    'department': 'perf'
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

  it('should create the user : user3', function callback(done) {
    BaseUser.create({ username: 'user3', email: 'user3@oe.com', password: 'user3', id: 'user3' }, bootstrap.defaultContext, function callback(err, users) {
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

  it('should create the user : user4', function callback(done) {
    BaseUser.create({ username: 'user4', email: 'user4@oe.com', password: 'user4', id: 'user4' }, bootstrap.defaultContext, function callback(err, users) {
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

  it('should create the user : user5', function callback(done) {
    BaseUser.create({ username: 'user5', email: 'user5@oe.com', password: 'user5', id: 'user5' }, bootstrap.defaultContext, function callback(err, users) {
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
    BaseRole.create({ name: 'admin', id: 'admin' }, bootstrap.defaultContext, function callback(err, role) {
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

  it('should create the role : manager', function callback(done) {
    BaseRole.create({ name: 'manager', id: 'manager' }, bootstrap.defaultContext, function callback(err, role) {
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

  it('should create the role : lead', function callback(done) {
    BaseRole.create({ name: 'lead', id: 'lead' }, bootstrap.defaultContext, function callback(err, role) {
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

  it('should create the role mapping : user2 to Manager', function callback(done) {
    BaseRoleMapping.findOrCreate({
      where: { principalType: 'USER', principalId: 'user2', roleId: 'manager' }
    }, { principalType: 'USER', principalId: 'user2', roleId: 'manager' }, bootstrap.defaultContext, function callback(err, roleMap) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(roleMap);
      done();
    });
  });

  it('should create the role mapping : user1 to admin', function callback(done) {
    BaseRoleMapping.findOrCreate({
      where: { principalType: 'USER', principalId: 'user1', roleId: 'admin' }
    }, { principalType: 'USER', principalId: 'user1', roleId: 'admin' }, bootstrap.defaultContext, function callback(err, roleMap) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(roleMap);
      done();
    });
  });

  it('should create the role mapping : user4 to lead', function callback(done) {
    BaseRoleMapping.findOrCreate({
      where: { principalType: 'USER', principalId: 'user4', roleId: 'lead' }
    }, { principalType: 'USER', principalId: 'user4', roleId: 'lead' }, bootstrap.defaultContext, function callback(err, roleMap) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(roleMap);
      done();
    });
  });

  it('should create the role mapping : user4 to admin', function callback(done) {
    BaseRoleMapping.findOrCreate({
      where: { principalType: 'USER', principalId: 'user4', roleId: 'admin' }
    }, { principalType: 'USER', principalId: 'user4', roleId: 'admin' }, bootstrap.defaultContext, function callback(err, roleMap) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(roleMap);
      done();
    });
  });

  it('should create the role mapping : user3 to manager', function callback(done) {
    BaseRoleMapping.findOrCreate({
      where: { principalType: 'USER', principalId: 'user3', roleId: 'manager' }
    }, { principalType: 'USER', principalId: 'user3', roleId: 'manager' }, bootstrap.defaultContext, function callback(err, roleMap) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(roleMap);
      done();
    });
  });

  it('should create the role mapping : user5 to manager', function callback(done) {
    BaseRoleMapping.findOrCreate({
      where: { principalType: 'USER', principalId: 'user5', roleId: 'manager' }
    }, { principalType: 'USER', principalId: 'user5', roleId: 'manager' }, bootstrap.defaultContext, function callback(err, roleMap) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(roleMap);
      done();
    });
  });

  it('should create the group mapping : user3 to perf', function callback(done) {
    UserProfile.create({ firstName: 'user3', lastName: 'oe', department: 'perf', userId: 'user3' }, bootstrap.defaultContext, function callback(err, profile) {
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

  it('should create the group mapping : user5 to foundation', function callback(done) {
    UserProfile.create({ firstName: 'user5', lastName: 'oe', department: 'foundation', userId: 'user5' }, bootstrap.defaultContext, function callback(err, profile) {
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

  it('should create the group mapping : user1 to workflow', function callback(done) {
    UserProfile.create({ firstName: 'user1', lastName: 'oe', department: 'workflow', userId: 'user1' }, bootstrap.defaultContext, function callback(err, profile) {
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

  it('should create the group mapping : user2 to workflow', function callback(done) {
    UserProfile.create({ firstName: 'user2', lastName: 'oe', department: 'workflow', userId: 'user2' }, bootstrap.defaultContext, function callback(err, profile) {
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

describe('Test case for taskManagement [ Authorized User ]', function callback() {
  this.timeout(10000);
  var name = 'taskManagement_Users';
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


describe('Test case for taskManagement [ Authorized User ]', function callback() {
  this.timeout(10000);
  var name = 'taskManagement_Users';
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

describe('Test case for taskManagement [ Unauthorized User ]', function callback() {
  this.timeout(40000);
  var name = 'taskManagement_Users';
  var testVars = {};

  it('should login as user : user3', function callback(done) {
    BaseUser.login({ username: 'user3', password: 'user3' }, bootstrap.defaultContext, function callback(err, token) {
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

      assert.strictEqual(response.statusCode, 404);
      setTimeout(done, 2000);
    }
  });

  it('validate process', function callback(done) {
    models.ProcessInstance.findById(testVars.processes[0].id, bootstrap.defaultContext, function callback(err, instance) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(instance);
      assert.equal(instance._status, 'running');
      var expectedTokens = [{ 'name': 'Start', 'status': 'complete' }, { 'name': 'UserTask[USERS]', 'status': 'pending' }];
      stateVerifier.verifyTokens(instance._processTokens, expectedTokens);
      setTimeout(done, 2000);
    });
  });
});

// Roles

describe('Test case for taskManagement [ Authorized Role ]', function callback() {
  this.timeout(10000);
  var name = 'taskManagement_Roles';
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
      var expectedFlow = ['Start', 'UserTask[ROLES]', 'End'];
      stateVerifier.verifyFlow(instance._processTokens, expectedFlow);
      setTimeout(done, 2000);
    });
  });
});

describe('Test case for taskManagement [ Unauthorized Role ]', function callback() {
  this.timeout(10000);
  var name = 'taskManagement_Roles';
  var testVars = {};

  it('should login as user : user4', function callback(done) {
    BaseUser.login({ username: 'user4', password: 'user4' }, bootstrap.defaultContext, function callback(err, token) {
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
      assert.strictEqual(response.statusCode, 404);
      setTimeout(done, 2000);
    }
  });


  it('validate process', function callback(done) {
    models.ProcessInstance.findById(testVars.processes[0].id, bootstrap.defaultContext, function callback(err, instance) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(instance);
      assert.equal(instance._status, 'running');
      var expectedTokens = [{ 'name': 'Start', 'status': 'complete' }, { 'name': 'UserTask[ROLES]', 'status': 'pending' }];
      stateVerifier.verifyTokens(instance._processTokens, expectedTokens);
      setTimeout(done, 2000);
    });
  });
});

// Groups

describe('Test case for taskManagement [ Authorized Group ]', function callback() {
  this.timeout(10000);
  var name = 'taskManagement_Groups';
  var testVars = {};

  it('should login as user : user1(Workflow)', function callback(done) {
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
      var expectedFlow = ['Start', 'UserTask[GROUPS]', 'End'];
      stateVerifier.verifyFlow(instance._processTokens, expectedFlow);
      setTimeout(done, 2000);
    });
  });
});

describe('Test case for taskManagement [ Unauthorized Group ]', function callback() {
  this.timeout(10000);
  var name = 'taskManagement_Groups';
  var testVars = {};

  it('should login as user : user5(Foundation)', function callback(done) {
    BaseUser.login({ username: 'user5', password: 'user5' }, bootstrap.defaultContext, function callback(err, token) {
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

      assert.strictEqual(response.statusCode, 404);
      setTimeout(done, 2000);
    }
  });


  it('validate process', function callback(done) {
    models.ProcessInstance.findById(testVars.processes[0].id, bootstrap.defaultContext, function callback(err, instance) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(instance);
      assert.equal(instance._status, 'running');
      var expectedTokens = [{ 'name': 'Start', 'status': 'complete' }, { 'name': 'UserTask[GROUPS]', 'status': 'pending' }];
      stateVerifier.verifyTokens(instance._processTokens, expectedTokens);
      setTimeout(done, 2000);
    });
  });
});

// Role - User exlcuded

describe('Test case for taskManagement [ Authorized Role ]', function callback() {
  this.timeout(10000);
  var name = 'taskManagement_RoleUser';
  var testVars = {};

  it('should login as user : user3(manager)', function callback(done) {
    BaseUser.login({ username: 'user3', password: 'user3' }, bootstrap.defaultContext, function callback(err, token) {
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
    testVars.processes[0].tasks({}, ctxUser3, function callback(err, task) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(task);
      assert.lengthOf(task, 1);
      testVars.task = task[0];
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
      var expectedFlow = ['Start', 'UserTask[RoleUser]', 'End'];
      stateVerifier.verifyFlow(instance._processTokens, expectedFlow);
      setTimeout(done, 2000);
    });
  });
});

describe('Test case for taskManagement [ Unauthorized User ]', function callback() {
  this.timeout(10000);
  var name = 'taskManagement_RoleUser';
  var testVars = {};

  it('should login as user : user2(manager(excluded))', function callback(done) {
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
    testVars.processes[0].tasks({}, ctxUser3, function callback(err, task) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(task);
      assert.lengthOf(task, 1);
      testVars.task = task[0];
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

      assert.strictEqual(response.statusCode, 404);
      setTimeout(done, 2000);
    }
  });


  it('validate process', function callback(done) {
    models.ProcessInstance.findById(testVars.processes[0].id, bootstrap.defaultContext, function callback(err, instance) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(instance);
      assert.equal(instance._status, 'running');
      var expectedTokens = [{ 'name': 'Start', 'status': 'complete' }, { 'name': 'UserTask[RoleUser]', 'status': 'pending' }];
      stateVerifier.verifyTokens(instance._processTokens, expectedTokens);
      setTimeout(done, 2000);
    });
  });
});


describe('Test case for taskManagement [ Authorized User ]', function callback() {
  this.timeout(10000);
  var name = 'taskManagement_User1';
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

describe('Test case for taskManagement [ Unauthorized User ]', function callback() {
  this.timeout(40000);
  var name = 'taskManagement_User1';
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
    testVars.processes[0].tasks({}, ctxUser1, function callback(err, task) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(task);
      assert.lengthOf(task, 1);
      testVars.task = task[0];
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

      assert.strictEqual(response.statusCode, 404);
      setTimeout(done, 2000);
    }
  });

  it('validate process', function callback(done) {
    models.ProcessInstance.findById(testVars.processes[0].id, bootstrap.defaultContext, function callback(err, instance) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(instance);
      assert.equal(instance._status, 'running');
      var expectedTokens = [{ 'name': 'Start', 'status': 'complete' }, { 'name': 'UserTask [user1]', 'status': 'pending' }];
      stateVerifier.verifyTokens(instance._processTokens, expectedTokens);
      setTimeout(done, 2000);
    });
  });
});

describe('Test case for taskManagement [ Authorized Role ]', function callback() {
  this.timeout(10000);
  var name = 'taskManagement_RoleManager';
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
      var expectedFlow = ['Start', 'UserTask [Manager]', 'End'];
      stateVerifier.verifyFlow(instance._processTokens, expectedFlow);
      setTimeout(done, 2000);
    });
  });
});

describe('Test case for taskManagement [ Unauthorized Role ]', function callback() {
  this.timeout(10000);
  var name = 'taskManagement_RoleManager';
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
    testVars.processes[0].tasks({}, ctxUser2, function callback(err, task) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(task);
      assert.lengthOf(task, 1);
      testVars.task = task[0];
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

      assert.strictEqual(response.statusCode, 404);
      setTimeout(done, 2000);
    }
  });


  it('validate process', function callback(done) {
    models.ProcessInstance.findById(testVars.processes[0].id, bootstrap.defaultContext, function callback(err, instance) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(instance);
      assert.equal(instance._status, 'running');
      var expectedTokens = [{ 'name': 'Start', 'status': 'complete' }, { 'name': 'UserTask [Manager]', 'status': 'pending' }];
      stateVerifier.verifyTokens(instance._processTokens, expectedTokens);
      setTimeout(done, 2000);
    });
  });
});
