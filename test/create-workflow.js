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
var VIP1Context = {
  ctx: {
    'tenantId': 'default',
    'remoteUser': 'vip1',
    'username': 'vip1'
  }
};
var VIP2Context = {
  ctx: {
    'tenantId': 'default',
    'remoteUser': 'vip2',
    'username': 'vip2',
    'roles': [
      'vip'
    ]
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
var VIP1Details = {
  'username': 'vip1',
  'email': 'vip1@oe.com',
  'password': 'vip1',
  'id': 'vip1'
};
var VIP2Details = {
  'username': 'vip2',
  'email': 'vip2@oe.com',
  'password': 'vip2',
  'id': 'vip2'
};
var User1Credentials = {
  'username': 'user1',
  'password': 'user1'
};
var User2Credentials = {
  'username': 'user2',
  'password': 'user2'
};
var VIP1Credentials = {
  'username': 'vip1',
  'password': 'vip1'
};
var VIP2Credentials = {
  'username': 'vip2',
  'password': 'vip2'
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

  it('should create user - vip1', function CB(done) {
    BaseUser.create(VIP1Details, bootstrap.defaultContext, function CB(err, users) {
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

  it('should create user - vip2', function CB(done) {
    BaseUser.create(VIP2Details, bootstrap.defaultContext, function CB(err, users) {
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

  it('should create the role : vip', function callback(done) {
    models.BaseRole.create({ name: 'vip', id: 'vip' }, bootstrap.defaultContext, function callback(err, role) {
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

  it('should create the role mapping : vip2 to vip', function callback(done) {
    models.BaseRoleMapping.findOrCreate({
      where: {
        and: [{
          principalType: 'USER'
        }, {
          principalId: 'vip2'
        }, {
          roleId: 'vip'
        }
        ]}
    }, { principalType: 'USER', principalId: 'vip2', roleId: 'vip' }, bootstrap.defaultContext, function callback(err, roleMap) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(roleMap);
      done();
    });
  });
});

describe('Test case for Trigger on Create OE Workflow [ not workflow dependent ]', function CB() {
  this.timeout(10000);
  var modelName = 'OEWorkflow_TestingM1CW';
  var wfName = 'ExclusiveGateway1';
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
        'luckydraw': {
          'type': 'string',
          'required': false
        }
      },
      'relations': {},
      'validations': []
    };


    models.ModelDefinition.create(postData, User1Context, function CB(err, res) {
      if (err) {
        done(err);
      } else {
        log.debug(res);
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
      if (bootstrap.checkDuplicateKeyError(err)) {
        done();
      } else {
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
      'wfDependent': false
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

  it('create an instance of ' + modelName, function CB(done) {
    models[modelName].create({
      'luckydraw': '00000'
    }, User1Context, function cb(err, res) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(res);
      assert.isNotNull(res._workflowRef);
      testVars._workflowRef = res._workflowRef;
      testVars.instanceId = res.id;
      assert.equal(res.luckydraw, '00000');
      assert.isNotNull(res._status);
      assert.equal(res._status, 'public');
      setTimeout(done, 1000);
    });
  });

  it('check if workflow instance is up', function CB(done) {
    models[modelName].workflow(testVars.instanceId, User1Context, function CB(err, instance) {
      if (err) {
        log.error(err);
        return done(err);
      } else if (instance === null) {
        var errNWinstance = new Error('No workflow instance found');
        log.error(errNWinstance);
        return done(errNWinstance);
      }

      log.debug(instance);
      assert.isNotNull(instance.workflowDefinitionName);
      assert.equal(instance.workflowDefinitionName, wfName);
      done();
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
      assert.isNotNull(instance.luckydraw);
      assert.strictEqual(instance._status, 'public');
      assert.strictEqual(instance.luckydraw, '00000');
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
      assert.isNotNull(instance.luckydraw);
      assert.strictEqual(instance._status, 'public');
      assert.strictEqual(instance.luckydraw, '00000');
      done();
    });
  });

  it('findById [REST] - user1', function CB(done) {
    bootstrap.login(User1Credentials, function CB(err, login) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(login.id);
      var url = 'http://localhost:3000/api' + '/' + modelName + 's/' + testVars.instanceId + '?access_token=' + bootstrap.token;

      request({ url: url, method: 'GET' }, onGet);

      function onGet(err, response) {
        if (err) {
          return done(err);
        }
        var instance = JSON.parse(response.body);
        log.debug(instance);
        assert.strictEqual(response.statusCode, 200);
        assert.isNotNull(instance);
        assert.isNotNull(instance._status);
        assert.isNotNull(instance.luckydraw);
        assert.strictEqual(instance._status, 'public');
        assert.strictEqual(instance.luckydraw, '00000');
        done();
      }
    });
  });

  it('findById [REST] - user2', function CB(done) {
    bootstrap.login(User2Credentials, function CB(err, login) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(login.id);
      var url = 'http://localhost:3000/api' + '/' + modelName + 's/' + testVars.instanceId + '?access_token=' + bootstrap.token;

      request({ url: url, method: 'GET' }, onGet);

      function onGet(err, response) {
        if (err) {
          return done(err);
        }
        var instance = JSON.parse(response.body);
        log.debug(instance);
        assert.strictEqual(response.statusCode, 200);
        assert.isNotNull(instance);
        assert.isNotNull(instance._status);
        assert.isNotNull(instance.luckydraw);
        assert.strictEqual(instance._status, 'public');
        assert.strictEqual(instance.luckydraw, '00000');
        done();
      }
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

describe('Test case for Trigger on Create OE Workflow [ workflow dependent ] - approved', function CB() {
  this.timeout(15000);
  var modelName = 'OEWorkflow_TestingM2CW';
  var wfName = 'ExclusiveGateway1';
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
        'luckydraw': {
          'type': 'string',
          'required': false
        }
      },
      'relations': {},
      'validations': []
    };


    models.ModelDefinition.create(postData, User1Context, function CB(err, res) {
      if (err) {
        done(err);
      } else {
        // log.debug(res);
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
      'wfDependent': true,
      'privilegedUsers': [
        'vip1',
        'vip3'
      ],
      'privilegedRoles': [
        'vip',
        'manager'
      ]
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
      'luckydraw': '00000'
    }, User1Context, function cb(err, instance) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(instance);
      testVars.instanceId = instance.id;
      assert.isNotNull(instance._status);
      assert.equal(instance._status, 'private');
      assert.equal(instance.luckydraw, '00000');
      testVars.instanceId = instance.id;
      testVars.instanceVersion = instance._version;
      done();
    });
  });

  it('check if workflow instance is up', function CB(done) {
    models[modelName].workflow(testVars.instanceId, User1Context, function CB(err, instance) {
      if (err) {
        log.error(err);
        return done(err);
      } else if (instance === null) {
        var errNoWinstance = new Error('No workflow instance found');
        log.error(errNoWinstance);
        return done(errNoWinstance);
      }

      log.debug(instance);
      testVars._workflowRef = instance.id;
      assert.isNotNull(instance.workflowDefinitionName);
      assert.equal(instance.workflowDefinitionName, wfName);
      done();
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
      assert.isNotNull(instance.luckydraw);
      assert.strictEqual(instance._status, 'private');
      assert.strictEqual(instance.luckydraw, '00000');
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

  it('findById - vip1 (Privileged User)', function CB(done) {
    models[modelName].findById(testVars.instanceId, VIP1Context, function cb(err, instance) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(instance);
      assert.isNotNull(instance);
      done();
    });
  });

  it('findById - vip2 (Privileged Role)', function CB(done) {
    models[modelName].findById(testVars.instanceId, VIP2Context, function cb(err, instance) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(instance);
      assert.isNotNull(instance);
      done();
    });
  });

  it('findById [REST] - user1', function CB(done) {
    bootstrap.login(User1Credentials, function CB(err, login) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(login.id);

      var url = bootstrap.basePath + '/' + modelName + 's/' + testVars.instanceId + '?access_token=' + bootstrap.token;

      request({ url: url, method: 'GET' }, onGet);

      function onGet(err, response) {
        if (err) {
          return done(err);
        }
        var instance = JSON.parse(response.body);
        assert.strictEqual(response.statusCode, 200);
        log.debug(instance);
        assert.isNotNull(instance);
        assert.isNotNull(instance._status);
        assert.isNotNull(instance.luckydraw);
        assert.strictEqual(instance._status, 'private');
        assert.strictEqual(instance.luckydraw, '00000');
        done();
      }
    });
  });

  it('findById [REST] - user2', function CB(done) {
    bootstrap.login(User2Credentials, function CB(err, login) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(login.id);

      var url = bootstrap.basePath + '/' + modelName + 's/' + testVars.instanceId + '?access_token=' + bootstrap.token;

      request({ url: url, method: 'GET' }, onGet);

      function onGet(err, response) {
        if (err) {
          return done(err);
        }
        var instance = JSON.parse(response.body);
        log.debug(instance);
        assert.strictEqual(response.statusCode, 404);
        done();
      }
    });
  });

  it('findById [REST] - vip1 (Privileged User)', function CB(done) {
    bootstrap.login(VIP1Credentials, function CB(err, login) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(login.id);

      var url = bootstrap.basePath + '/' + modelName + 's/' + testVars.instanceId + '?access_token=' + bootstrap.token;

      request({ url: url, method: 'GET' }, onGet);

      function onGet(err, response) {
        if (err) {
          return done(err);
        }
        var instance = JSON.parse(response.body);
        assert.strictEqual(response.statusCode, 200);
        log.debug(instance);
        assert.isNotNull(instance);
        assert.isNotNull(instance._status);
        assert.isNotNull(instance.luckydraw);
        assert.strictEqual(instance._status, 'private');
        assert.strictEqual(instance.luckydraw, '00000');
        done();
      }
    });
  });

  it('findById [REST] - vip2 (Privileged Role)', function CB(done) {
    bootstrap.login(VIP2Credentials, function CB(err, login) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(login.id);

      var url = bootstrap.basePath + '/' + modelName + 's/' + testVars.instanceId + '?access_token=' + bootstrap.token;

      request({ url: url, method: 'GET' }, onGet);

      function onGet(err, response) {
        if (err) {
          return done(err);
        }
        var instance = JSON.parse(response.body);
        assert.strictEqual(response.statusCode, 200);
        log.debug(instance);
        assert.isNotNull(instance);
        assert.isNotNull(instance._status);
        assert.isNotNull(instance.luckydraw);
        assert.strictEqual(instance._status, 'private');
        assert.strictEqual(instance.luckydraw, '00000');
        done();
      }
    });
  });

  it('should not be able to update instance [UpdateAttributes/PUT by Id] - user1', function CB(done) {
    models[modelName].findById(testVars.instanceId, User1Context, function cb(err, instance) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(instance);

      instance.updateAttributes({
        'luckydraw': '3333'
      }, User1Context, function CB(err, inst) {
        if (err) {
          log.debug(err);
          assert.isNotNull(err);
          assert.strictEqual(err.statusCode, 400);
          assert.strictEqual(err.code, 'ATTACH_WORKFLOW_BAD_REQUEST');
          return done();
        }

        log.debug(inst);
        var errx = new Error('Instance should not have been updated.');
        log.error(errx);
        done(errx);
      });
    });
  });

  it('should not be able to update instance [UpdateAttributes/PUT by Id]- user2 (Any Other User)', function CB(done) {
    models[modelName].findById(testVars.instanceId, User2Context, function cb(err, instance) {
      if (err) {
        log.error(err);
        return done(err);
      }

      log.debug(instance);
      assert.isNull(instance);
      return done();
      // instance is already null so anyway instance.updateAttributes is not applicable
    });
  });

  it('should not be able to update instance [UpdateAttributes/PUT by Id] - vip1 (Privileged User)', function CB(done) {
    models[modelName].findById(testVars.instanceId, VIP1Context, function cb(err, instance) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(instance);

      instance.updateAttributes({
        'luckydraw': '3333'
      }, User1Context, function CB(err, inst) {
        if (err) {
          log.debug(err);
          assert.isNotNull(err);
          assert.strictEqual(err.statusCode, 400);
          assert.strictEqual(err.code, 'ATTACH_WORKFLOW_BAD_REQUEST');
          return done();
        }

        log.debug(inst);
        var errx = new Error('Instance should not have been updated.');
        log.error(errx);
        done(errx);
      });
    });
  });

  it('should not be able to update instance [UpdateAttributes/PUT by Id] - vip2 (Privileged Role)', function CB(done) {
    models[modelName].findById(testVars.instanceId, VIP2Context, function cb(err, instance) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(instance);

      instance.updateAttributes({
        'luckydraw': '3333'
      }, User1Context, function CB(err, inst) {
        if (err) {
          log.debug(err);
          assert.isNotNull(err);
          assert.strictEqual(err.statusCode, 400);
          assert.strictEqual(err.code, 'ATTACH_WORKFLOW_BAD_REQUEST');
          return done();
        }

        log.debug(inst);
        var errx = new Error('Instance should not have been updated.');
        log.error(errx);
        done(errx);
      });
    });
  });

  it('should not be able to update instance [Upsert/PUT] - user1', function CB(done) {
    models[modelName].upsert({
      'luckydraw': '3333',
      'id': testVars.instanceId,
      '_version': testVars.instanceVersion
    }, User1Context, function CB(err, inst) {
      if (err) {
        log.debug(err);
        assert.isNotNull(err);
        assert.strictEqual(err.statusCode, 400);
        assert.strictEqual(err.code, 'ATTACH_WORKFLOW_BAD_REQUEST');
        return done();
      }

      log.debug(inst);
      var errx = new Error('Instance should not have been updated.');
      log.error(errx);
      done(errx);
    });
  });

  it('should not be able to update instance [Upsert/PUT]- user2 (Any Other User)', function CB(done) {
    models[modelName].upsert({
      'luckydraw': '3333',
      'id': testVars.instanceId,
      '_version': testVars.instanceVersion
    }, User2Context, function CB(err, inst) {
      if (err) {
        log.debug(err);
        assert.isNotNull(err);
        assert.strictEqual(err.statusCode, 400);
        assert.strictEqual(err.code, 'ATTACH_WORKFLOW_BAD_REQUEST');
        return done();
      }

      log.debug(inst);
      var errx = new Error('Instance should not have been updated.');
      log.error(errx);
      done(errx);
    });
  });

  it('should not be able to update instance [Upsert/PUT] - vip1 (Privileged User)', function CB(done) {
    models[modelName].upsert({
      'luckydraw': '3333',
      'id': testVars.instanceId,
      '_version': testVars.instanceVersion
    }, VIP1Context, function CB(err, inst) {
      if (err) {
        log.debug(err);
        assert.isNotNull(err);
        assert.strictEqual(err.statusCode, 400);
        assert.strictEqual(err.code, 'ATTACH_WORKFLOW_BAD_REQUEST');
        return done();
      }

      log.debug(inst);
      var errx = new Error('Instance should not have been updated.');
      log.error(errx);
      done(errx);
    });
  });

  it('should not be able to update instance [Upsert/PUT] - vip2 (Privileged Role)', function CB(done) {
    models[modelName].upsert({
      'luckydraw': '3333',
      'id': testVars.instanceId,
      '_version': testVars.instanceVersion
    }, VIP2Context, function CB(err, inst) {
      if (err) {
        log.debug(err);
        assert.isNotNull(err);
        assert.strictEqual(err.statusCode, 400);
        assert.strictEqual(err.code, 'ATTACH_WORKFLOW_BAD_REQUEST');
        return done();
      }

      log.debug(inst);
      var errx = new Error('Instance should not have been updated.');
      log.error(errx);
      done(errx);
    });
  });

  // till delete part is updated by user2 - user1
  it('should not be able to delete instance - user1', function CB(done) {
    models[modelName].findById(testVars.instanceId, User1Context, function cb(err, instance) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(instance);

      models[modelName].deleteWithVersion(instance.id, instance._version, User1Context, function CB(err, inst) {
        if (err) {
          log.debug(err);
          assert.isNotNull(err);
          assert.strictEqual(err.statusCode, 400);
          assert.strictEqual(err.code, 'ATTACH_WORKFLOW_BAD_REQUEST');
          return done();
        }

        log.debug(inst);
        var errx = new Error('Instance should not have been deleted.');
        log.error(errx);
        done(errx);
      });
    });
  });

  it('should not be able to delete instance - user2 (Any other user)', function CB(done) {
    models[modelName].deleteWithVersion(testVars.instanceId, testVars.instanceVersion, User2Context, function CB(err, inst) {
      if (err) {
        log.debug(err);
        assert.isNotNull(err);
        log.debug(JSON.stringify(testVars, null, '\t'));
        return done();
      }

      log.debug(inst);
      var errx = new Error('Instance should not have been deleted.');
      log.error(errx);
      done(errx);
    });
  });

  it('should not be able to delete instance - vip1 (Privileged User)', function CB(done) {
    models[modelName].deleteWithVersion(testVars.instanceId, testVars.instanceVersion, VIP1Context, function CB(err, inst) {
      if (err) {
        log.debug(err);
        assert.isNotNull(err);
        return done();
      }

      log.debug(inst);
      var errx = new Error('Instance should not have been deleted.');
      log.error(errx);
      done(errx);
    });
  });

  it('should not be able to delete instance - vip2 (Privileged Role)', function CB(done) {
    models[modelName].deleteWithVersion(testVars.instanceId, testVars.instanceVersion, VIP2Context, function CB(err, inst) {
      if (err) {
        log.debug(err);
        assert.isNotNull(err);
        return done();
      }

      log.debug(inst);
      var errx = new Error('Instance should not have been deleted.');
      log.error(errx);
      done(errx);
    });
  });

  // TODO : create a real scenario around this
  it('fetch tasks if any', function CB(done) {
    models[modelName].tasks(testVars.instanceId,User1Context,
    function cb(err, res) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(res);
      assert.isNotNull(res);
      done();
    });
  });

  it('end create request [ through OE Workflow ]', function CB(done) {
    models.WorkflowManager.endAttachWfRequest({
      workflowInstanceId: testVars._workflowRef,
      status: 'approved'
    },
    User1Context,
    function cb(err, res) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(res);
      assert.isNotNull(res);
      done();
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
      assert.isNotNull(instance.luckydraw);
      assert.strictEqual(instance._status, 'public');
      assert.strictEqual(instance.luckydraw, '00000');
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
      assert.isNotNull(instance.luckydraw);
      assert.strictEqual(instance._status, 'public');
      assert.strictEqual(instance.luckydraw, '00000');
      done();
    });
  });

  it('findById [REST] - user1', function CB(done) {
    bootstrap.login(User1Credentials, function CB(err, login) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(login.id);
      //   var token = login.id;

      var url = bootstrap.basePath + '/' + modelName + 's/' + testVars.instanceId + '?access_token=' + bootstrap.token;

      request({ url: url, method: 'GET' }, onGet);

      function onGet(err, response) {
        if (err) {
          return done(err);
        }
        var instance = JSON.parse(response.body);
        assert.strictEqual(response.statusCode, 200);
        log.debug(instance);
        assert.isNotNull(instance);
        assert.isNotNull(instance._status);
        assert.isNotNull(instance.luckydraw);
        assert.strictEqual(instance._status, 'public');
        assert.strictEqual(instance.luckydraw, '00000');
        done();
      }
    });
  });

  it('findById [REST] - user2', function CB(done) {
    bootstrap.login(User2Credentials, function CB(err, login) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(login.id);

      var url = bootstrap.basePath + '/' + modelName + 's/' + testVars.instanceId + '?access_token=' + bootstrap.token;

      request({ url: url, method: 'GET' }, onGet);

      function onGet(err, response) {
        if (err) {
          return done(err);
        }
        var instance = JSON.parse(response.body);
        assert.strictEqual(response.statusCode, 200);
        log.debug(instance);
        assert.isNotNull(instance);
        assert.isNotNull(instance._status);
        assert.isNotNull(instance.luckydraw);
        assert.strictEqual(instance._status, 'public');
        assert.strictEqual(instance.luckydraw, '00000');
        done();
      }
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

describe('Test case for Trigger on Create OE Workflow [ workflow dependent ] - rejected', function CB() {
  this.timeout(15000);
  var modelName = 'OEWorkflow_TestingM3CW';
  var wfName = 'ExclusiveGateway1';
  var testVars = {};

  it('should create testing model - ' + modelName, function CB(done) {
    var postData = {
      'name': modelName,
      'base': 'BaseEntity',
      'idInjection': true,
      'options': {
        'validateUpsert': true
      },
      'mixins': {
        // "SoftDeleteMixin": false
      },
      'properties': {
        'luckydraw': {
          'type': 'string',
          'required': false
        }
      },
      'relations': {},
      'validations': []
    };


    models.ModelDefinition.create(postData, User1Context, function CB(err, res) {
      if (err) {
        done(err);
      } else {
        log.debug(res);
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

  it('create an instance of ' + modelName, function CB(done) {
    models[modelName].create({
      'luckydraw': '00000'
    }, User1Context, function cb(err, res) {
      if (err) {
        log.error(err);
        return done(err);
      }
      testVars.instanceId = res.id;
      assert.isNotNull(res._status);
      assert.equal(res._status, 'private');
      assert.isNotNull(res.luckydraw);
      assert.equal(res.luckydraw, '00000');
      log.debug(res);
      setTimeout(done, 1000);
    });
  });

  it('check if workflow instance is up', function CB(done) {
    models[modelName].workflow(testVars.instanceId, User1Context, function CB(err, instance) {
      if (err) {
        log.error(err);
        return done(err);
      } else if (instance === null) {
        var errNoWFinstance = new Error('No workflow instance found');
        log.error(errNoWFinstance);
        return done(errNoWFinstance);
      }

      log.debug(instance);
      testVars._workflowRef = instance.id;
      assert.isNotNull(instance.workflowDefinitionName);
      assert.equal(instance.workflowDefinitionName, wfName);
      done();
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
      assert.isNotNull(instance.luckydraw);
      assert.strictEqual(instance._status, 'private');
      assert.strictEqual(instance.luckydraw, '00000');
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

  it('findById [REST] - user1', function CB(done) {
    bootstrap.login(User1Credentials, function CB(err, login) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(login.id);
      //   var token = login.id;

      var url = bootstrap.basePath + '/' + modelName + 's/' + testVars.instanceId + '?access_token=' + bootstrap.token;

      request({ url: url, method: 'GET' }, onGet);

      function onGet(err, response) {
        if (err) {
          return done(err);
        }
        var instance = JSON.parse(response.body);
        assert.strictEqual(response.statusCode, 200);
        log.debug(instance);
        assert.isNotNull(instance);
        assert.isNotNull(instance._status);
        assert.isNotNull(instance.luckydraw);
        assert.strictEqual(instance._status, 'private');
        assert.strictEqual(instance.luckydraw, '00000');
        done();
      }
    });
  });

  it('findById [REST] - user2', function CB(done) {
    bootstrap.login(User2Credentials, function CB(err, login) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(login.id);

      var url = bootstrap.basePath + '/' + modelName + 's/' + testVars.instanceId + '?access_token=' + bootstrap.token;

      request({ url: url, method: 'GET' }, onGet);

      function onGet(err, response) {
        if (err) {
          return done(err);
        }
        var instance = JSON.parse(response.body);
        assert.strictEqual(response.statusCode, 404);
        log.debug(instance);
        done();
      }
    });
  });


  it('end create request [ through OE Workflow ]', function CB(done) {
    models.WorkflowManager.endAttachWfRequest({
      workflowInstanceId: testVars._workflowRef,
      status: 'rejected'
    },
    User1Context,
    function cb(err, res) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(res);
      assert.isNotNull(res);
      done();
    });
  });


  it('findById - user1', function CB(done) {
    models[modelName].findById(testVars.instanceId, User1Context, function cb(err, instance) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(instance);
      assert.isNull(instance);
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

  it('findById [REST] - user1', function CB(done) {
    bootstrap.login(User1Credentials, function CB(err, login) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(login.id);
      //   var token = login.id;

      var url = bootstrap.basePath + '/' + modelName + 's/' + testVars.instanceId + '?access_token=' + bootstrap.token;

      request({ url: url, method: 'GET' }, onGet);

      function onGet(err, response) {
        if (err) {
          return done(err);
        }
        var instance = JSON.parse(response.body);
        log.debug(instance);
        assert.strictEqual(response.statusCode, 404);
        done();
      }
    });
  });

  it('findById [REST] - user2', function CB(done) {
    bootstrap.login(User2Credentials, function CB(err, login) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(login.id);

      var url = bootstrap.basePath + '/' + modelName + 's/' + testVars.instanceId + '?access_token=' + bootstrap.token;

      request({ url: url, method: 'GET' }, onGet);

      function onGet(err, response) {
        if (err) {
          return done(err);
        }
        var instance = JSON.parse(response.body);
        log.debug(instance);
        assert.strictEqual(response.statusCode, 404);
        done();
      }
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
