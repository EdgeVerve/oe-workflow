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
var expect = chai.expect;
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

describe('User Creation', function CB() {
  this.timeout(10000);
  var BaseUser = models.BaseUser;

  it('should create user - user1', function CB(done) {
    BaseUser.create(User1Details, bootstrap.defaultContext, function CB(err, users) {
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

  it('should create user - user2', function CB(done) {
    BaseUser.create(User2Details, bootstrap.defaultContext, function CB(err, users) {
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

describe('Test case for Conclude Transaction Node - workflow attach on create approved scenario', function CB() {
  this.timeout(15000);
  var modelName = 'LoanModel';
  var wfName = 'LoanApprovalBasicWorkflow2';
  var testVars = {};

  it('should create testing model - ' + modelName, function CB(done) {
    var postData = {
      'name': modelName,
      'base': 'BaseEntity',
      'idInjection': true,
      'options': {
        'validateUpsert': true
      },
      'mixins': {},
      'properties': {
        'amount': {
          'type': 'number',
          'required': true
        },
        'tenure': {
          'type': 'number',
          'required': true
        }
      },
      'relations': {},
      'validations': []
    };


    models.ModelDefinition.create(postData, User1Context, function CB(err, res) {
      if (err) {
        done(err);
      } else {
        expect(models[modelName]).not.to.be.null;
        expect(models[modelName].definition.properties).not.to.be.undefined;
        expect(Object.keys(models[modelName].definition.properties)).
          to.include.members(Object.keys(models.BaseEntity.definition.properties));
        testVars.modelDetails = res;
        done();
      }
    });
  });

  it('should read the file', function CB(done) {
    fs.readFile(path.resolve('./test/bpmn-files', wfName + '.bpmn'), 'utf8', (err, data) => {
      testVars.xmldata = data;
      done(err);
    });
  });

  it('deploy the WorkflowDefinition', function CB(done) {
    var defData = { 'name': wfName, 'xmldata': testVars.xmldata };
    models.WorkflowDefinition.create(defData, bootstrap.defaultContext, function CB(err, res) {
      // Code for duplicate keys
      if (bootstrap.checkDuplicateKeyError(err))              {done();}          else {
        done(err);
      }
    });
  });

  it('should attach workflow to ' + modelName, function CB(done) {
    var attachWorkflowDef = {
      'modelName': modelName,
      'workflowBody': {
        'workflowDefinitionName': wfName
      },
      'operation': 'create',
      'wfDependent': true
    };

    models.WorkflowManager.attachWorkflow(attachWorkflowDef, bootstrap.defaultContext, function cb(err, res) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(res);
      done();
    });
  });

  it('create an instance of ' + modelName + ' : author - user1', function CB(done) {
    models[modelName].create({
      'amount': 10000,
      'tenure': 3
    }, User1Context, function cb(err, instance) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(instance);
      testVars.instanceId = instance.id;
      assert.isNotNull(instance._status);
      assert.equal(instance._status, 'private');
      assert.equal(instance.amount, 10000);
      assert.equal(instance.tenure, 3);
      testVars.instanceId = instance.id;
      testVars.instanceVersion = instance._version;
      setTimeout(done, 2000);
    });
  });

  it('check if workflow instance is up', function CB(done) {
    models[modelName].workflow(testVars.instanceId, User1Context, function CB(err, instance) {
      if (err) {
        log.error(err);
        return done(err);
      } else if (instance === null) {
        var errNWInstance = new Error('No workflow instance found');
        log.error(errNWInstance);
        return done(errNWInstance);
      }

      log.debug(instance);
      testVars._workflowRef = instance.id;
      assert.isNotNull(instance.workflowDefinitionName);
      assert.equal(instance.workflowDefinitionName, wfName);
      // storing process id to fetch instance later
      instance.processes({}, User1Context, function CB(err, processes) {
        if (err) {
          log.error(err);
          return done(err);
        }
        testVars.processId = processes[0].id;
        done();
      });
    });
  });

  it('findById - user1', function CB(done) {
    models[modelName].findById(testVars.instanceId, User1Context, function cb(err, instance) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(instance);
      assert.isNotNull(instance);
      assert.isNotNull(instance._status);
      assert.isNotNull(instance.amount);
      assert.isNotNull(instance.tenure);
      assert.strictEqual(instance._status, 'private');
      assert.strictEqual(instance.amount, 10000);
      assert.strictEqual(instance.tenure, 3);
      done();
    });
  });

  it('findById - user2', function CB(done) {
    models[modelName].findById(testVars.instanceId, User2Context, function cb(err, instance) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(instance);
      assert.isNull(instance);
      done();
    });
  });

  it('fetch and complete task - user1', function CB(done) {
    models.Task.find({
      where: {
        processInstanceId: testVars.processId
      }
    }, User1Context, function cb(err, tasks) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(tasks);

      tasks[0].completeTask({}, { '_action': 'approved' }, User1Context, function CB(err, task) {
        if (err) {
          log.error(err);
          return done(err);
        }
        setTimeout(done, 2000);
      });
    });
  });

  it('findById - user1', function CB(done) {
    models[modelName].findById(testVars.instanceId, User1Context, function cb(err, instance) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(instance);
      assert.isNotNull(instance);
      assert.isNotNull(instance._status);
      assert.strictEqual(instance._status, 'public');
      assert.strictEqual(instance.amount, 10000);
      assert.strictEqual(instance.tenure, 3);
      done();
    });
  });

  it('findById - user2', function CB(done) {
    models[modelName].findById(testVars.instanceId, User2Context, function cb(err, instance) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(instance);
      assert.isNotNull(instance);
      assert.isNotNull(instance._status);
      assert.strictEqual(instance._status, 'public');
      assert.strictEqual(instance.amount, 10000);
      assert.strictEqual(instance.tenure, 3);
      done();
    });
  });

  it('remove model instances [clean-up]', function CB(done) {
    models[modelName].destroyAll({}, User1Context, function cb(err, res) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(res);
      done();
    });
  });

  it('remove model Definition ' + modelName + ' [clean-up]', function CB(done) {
    var id = testVars.modelDetails.id;
    var version = testVars.modelDetails._version;
    models.ModelDefinition.deleteWithVersion(id, version, User1Context, function CB(err) {
      if (err) {
        done(err);
      } else {
        done();
      }
    });
  });

  it('remove workflow mapping [clean-up]', function CB(done) {
    models.WorkflowMapping.destroyAll({}, User1Context, function cb(err, res) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(res);
      done();
    });
  });
});
