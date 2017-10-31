var fs = require('fs');
var path = require('path');

var bootstrap = require('./bootstrap');
var chai = bootstrap.chai;
var assert = chai.assert;
var models = bootstrap.models;

var stateVerifier = require('./utils/stateverifier');

var BaseUser = models.BaseUser;
var BaseRole = models.BaseRole;
var BaseRoleMapping = models.BaseRoleMapping;

var ctxUser1 = {
  ctx: {
    'tenantId': 'default',
    'remoteUser': 'user1',
    'username': 'user1',
    'roles': [
      'customer'
    ],
    'department': 'customer'
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
    'department': 'admins'
  }
};
var ctxUser3 = {
  ctx: {
    'tenantId': 'default',
    'remoteUser': 'user3',
    'username': 'user3',
    'roles': [
      'admin'
    ],
    'department': 'admins'
  }
};

describe('Test case for pools3 - Creating Users, Roles(Role Mapping), and Groups', function callback() {
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

  it('should create the role : Admin', function callback(done) {
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

  it('should create the role : Manager', function callback(done) {
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

  it('should create the role : Customer', function callback(done) {
    BaseRole.create({ name: 'customer', id: 'customer' }, bootstrap.defaultContext, function callback(err, role) {
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

  it('should create the role mapping : user1 to customer', function callback(done) {
    BaseRoleMapping.findOrCreate({
      where: { principalType: 'USER', principalId: 'user1', roleId: 'customer' }
    }, { principalType: 'USER', principalId: 'user1', roleId: 'customer' }, bootstrap.defaultContext, function callback(err, roleMap) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(roleMap);
      done();
    });
  });

  it('should create the role mapping : user3 to admin', function callback(done) {
    BaseRoleMapping.findOrCreate({
      where: { principalType: 'USER', principalId: 'user3', roleId: 'admin' }
    }, { principalType: 'USER', principalId: 'user3', roleId: 'admin' }, bootstrap.defaultContext, function callback(err, roleMap) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(roleMap);
      done();
    });
  });
});

describe('Test case for pools1', function callback() {
  this.timeout(30000);
  var name = 'pools3';
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
      setTimeout(done, 2000);
    });
  });

  it('fetch process instance', function callback(done) {
    testVars.mainWorkflowInstance.processes({}, bootstrap.defaultContext, function callback(err, processes) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(processes);
      assert.lengthOf(processes, 1);
      testVars.mainProcess = processes[0];
      setTimeout(done, 2000);
    });
  });

  it('validate tasks of processes', function callback(done) {
    testVars.mainProcess.tasks({}, ctxUser2, function callback(err, tasks) {
      if (err) {
        return done(err);
      }
      var expectedTasks = [{ 'name': 'TaskA', 'status': 'pending' }];
      stateVerifier.verifyTasks(tasks, expectedTasks);
      assert.equal(tasks[0].candidateRoles[0], 'manager');
      testVars.tasks = tasks;
      done();
    });
  });


  it('complete task 1', function callback(done) {
    testVars.tasks[0].completeTask({}, { 'taskA': 1 }, ctxUser2, function callback(err) {
      if (err) {
        return done(err);
      }
      setTimeout(done, 2000);
    });
  });


  it('validate tasks of processes', function callback(done) {
    testVars.mainProcess.tasks({}, ctxUser1, function callback(err, tasks) {
      if (err) {
        return done(err);
      }
      var expectedTasks = [{ 'name': 'TaskB', 'status': 'pending' }];
      stateVerifier.verifyTasks(tasks, expectedTasks);
      assert.equal(tasks[0].candidateUsers[0], 'user1');
      testVars.tasks = tasks;
      done();
    });
  });


  it('complete task 2', function callback(done) {
    testVars.tasks[0].completeTask({}, { 'taskB': 1 }, ctxUser1, function callback(err) {
      if (err) {
        return done(err);
      }
      setTimeout(done, 2000);
    });
  });


  it('validate tasks of processes', function callback(done) {
    testVars.mainProcess.tasks({}, ctxUser3, function callback(err, tasks) {
      if (err) {
        return done(err);
      }
      var expectedTasks = [
        { 'name': 'TaskC', 'status': 'pending' }
      ];

      stateVerifier.verifyTasks(tasks, expectedTasks);
      assert.equal(tasks[0].candidateGroups[0], 'admins');
      testVars.tasks = tasks;

      done();
    });
  });


  it('complete task 2', function callback(done) {
    testVars.tasks[0].completeTask({}, { 'taskC': 1 }, ctxUser3, function callback(err) {
      if (err) {
        return done(err);
      }
      setTimeout(done, 2000);
    });
  });

  it('validate tasks of processes', function callback(done) {
    testVars.mainProcess.tasks({}, ctxUser3, function callback(err, tasks) {
      if (err) {
        return done(err);
      }
      var expectedTasks = [
                            { 'name': 'TaskC', 'status': 'complete' },
                            { 'name': 'TaskD', 'status': 'pending' }
      ];
      stateVerifier.verifyTasks(tasks, expectedTasks);
      assert.equal(tasks[1].candidateGroups[0], 'admins');
      testVars.tasks = tasks;

      done();
    });
  });


  it('complete task 3', function callback(done) {
    testVars.tasks[1].completeTask({}, {}, ctxUser3, function callback(err) {
      if (err) {
        return done(err);
      }
      setTimeout(done, 2000);
    });
  });


  it('validate 1st process', function callback(done) {
    models.ProcessInstance.findById(testVars.mainProcess.id, bootstrap.defaultContext, function callback(err, instance) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(instance);
      assert.equal(instance._status, 'complete');
      var expectedVariables = { 'taskA': 1, 'taskB': 1, 'taskC': 1 };
      stateVerifier.verifyProcessVariables(instance._processVariables, expectedVariables);
      var expectedFlow = ['Start', 'TaskA', 'TaskB', 'TaskC', 'TaskD', 'End'];
      stateVerifier.verifyFlow(instance._processTokens, expectedFlow);
      done();
    });
  });
});
