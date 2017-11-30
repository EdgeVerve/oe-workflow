
/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

var request = require('request');

var bootstrap = require('../bootstrap');
var chai = bootstrap.chai;
var expect = chai.expect;
var models = bootstrap.models;
var assert = chai.assert;
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
var User1Credentials = {
  'username': 'user1',
  'password': 'user1'
};
var User2Credentials = {
  'username': 'user2',
  'password': 'user2'
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

describe('Test case for Trigger on Update Activiti [ not workflow dependent ]', function callback() {
  this.timeout(10000);
  var testVars = {};
  var modelName = 'Activiti_TestingM1';

  it('should create testing model - ' + modelName, function callback(done) {
    var postData = {
      'name': modelName,
      'base': 'BaseEntity',
      'idInjection': true,
      'options': {
        'validateUpsert': true
      },
      'mixins': {
      },
      'properties': {
        'luckydraw': {
          'type': 'string',
          'required': false
        }
      },
      'relations': {
      },
      'validations': []
    };


    models.ModelDefinition.create(postData, User1Context, function callback(err, res) {
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

  it('should attach workflow to ' + modelName, function callback(done) {
    var attachWorkflowDef = {
      'modelName': modelName,
      'workflowBody': {
        'processDefinitionId': 'escalationExample:1:36'
      },
      'operation': 'update',
      'wfDependent': false
    };

    models.ActivitiManager.attachWorkflow(attachWorkflowDef
      , bootstrap.defaultContext, function cb(err, res) {
        if (err) {
          log.error(err);
          return done(err);
        }
        log.debug(res);
        done();
      });
  });

  it('create an instance of ' + modelName, function callback(done) {
    models[modelName].create({
      'luckydraw': '00000'
    }, User1Context, function cb(err, res) {
      if (err) {
        log.error(err);
        return done(err);
      }
      assert.isNotNull(res.id);
      testVars.instanceId = res.id;
      testVars.modelInstance = res;
      assert.isNotNull(res._version);
      testVars.instanceVersion = res._version;
      log.debug(res);
      done();
    });
  });

  it('update Upsert the instance of ' + modelName, function callback(done) {
    // NOTE : updateById is not working in oe-foundation when used with version mixin [ even in their test case upsert is used insted of updateById in version-mixin-test ]
    // actually there is no updateById on observer hook loopback page , its replacebyid
    // but while we remotely execute PUT on Model its equivaled to update attributes or upsert (upsert will either create or update depending to instance existence)
    // updateAttributes is attached to instance [ thats why prototype.updateAttributes ]

    models[modelName].upsert({
      'id': testVars.instanceId,
      'luckydraw': '11111',
      '_version': testVars.instanceVersion
    }, User1Context, function cb(err, res) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(res);
      assert.isNotNull(res.luckydraw);
      assert.equal(res.luckydraw, '11111');
      assert.isNotNull(res._status);
      assert.equal(res._status, 'public');
      done();
    });
  });

  it('check if workflow instance is up', function callback(done) {
    models[modelName].workflow(testVars.instanceId, User1Context, function callback(err, instance) {
      if (err) {
        log.error(err);
        return done(err);
      } else if (instance === null) {
        err = new Error('No workflow instance found');
        log.error(err);
        return done(err);
      }

      log.debug(instance);
      assert.isNotNull(instance.processDefinitionId);
      testVars._workflowRef = instance.id;
      assert.equal(instance.processDefinitionId, 'escalationExample:1:36');
      done();
    });
  });

  it('findById - user1', function callback(done) {
    models[modelName].findById(testVars.instanceId
      , User1Context, function cb(err, instance) {
        if (err) {
          log.error(err);
          return done(err);
        }
        log.debug(instance);
        assert.isNotNull(instance);
        assert.isNotNull(instance._status);
        assert.isNotNull(instance.luckydraw);
        assert.strictEqual(instance._status, 'public');
        assert.strictEqual(instance.luckydraw, '11111');
        done();
      });
  });

  it('findById - user2', function callback(done) {
    models[modelName].findById(testVars.instanceId
      , User2Context, function cb(err, instance) {
        if (err) {
          log.error(err);
          return done(err);
        }
        log.debug(instance);
        assert.isNotNull(instance);
        assert.isNotNull(instance._status);
        assert.isNotNull(instance.luckydraw);
        assert.strictEqual(instance._status, 'public');
        assert.strictEqual(instance.luckydraw, '11111');
        done();
      });
  });

  it('findById [REST] - user1', function callback(done) {
    bootstrap.login(User1Credentials, function callback(err, login) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(login.id);
      var token = login.id;

      var url = bootstrap.basePath + '/' + modelName + 's/' + testVars.instanceId + '?access_token=' + token;

      request({ url: url, method: 'GET' }, onGet);

      function onGet(err, response) {
        if (err) {
          return done(err);
        }
        var instance = JSON.parse(response.body);
        assert.strictEqual( response.statusCode, 200);
        log.debug(instance);
        assert.isNotNull(instance);
        assert.isNotNull(instance._status);
        assert.isNotNull(instance.luckydraw);
        assert.strictEqual(instance._status, 'public');
        assert.strictEqual(instance.luckydraw, '11111');
        done();
      }
    });
  });

  it('findById [REST] - user2', function callback(done) {
    bootstrap.login(User2Credentials, function callback(err, login) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(login.id);
      var token = login.id;

      var url = bootstrap.basePath + '/' + modelName + 's/' + testVars.instanceId + '?access_token=' + token;

      request({ url: url, method: 'GET'}, onGet);

      function onGet(err, response) {
        if (err) {
          return done(err);
        }
        var instance = JSON.parse(response.body);
        assert.strictEqual( response.statusCode, 200);
        log.debug(instance);
        assert.isNotNull(instance);
        assert.isNotNull(instance._status);
        assert.isNotNull(instance.luckydraw);
        assert.strictEqual(instance._status, 'public');
        assert.strictEqual(instance.luckydraw, '11111');
        done();
      }
    });
  });

  it('remove model instances [clean-up]', function callback(done) {
    models[modelName].destroyAll({}
      , User1Context, function cb(err, res) {
        if (err) {
          log.error(err);
          return done(err);
        }
        log.debug(res);
        done();
      });
  });

  it('remove model Definition ' + modelName + ' [clean-up]', function callback(done) {
    var id = testVars.modelDetails.id;
    models.ModelDefinition.destroyById(id, User1Context, function callback(err) {
      if (err) {
        done(err);
      } else {
        done();
      }
    });
  });

  it('remove workflow mapping [clean-up]', function callback(done) {
    models.WorkflowMapping.destroyAll({}
      , User1Context, function cb(err, res) {
        if (err) {
          log.error(err);
          return done(err);
        }
        log.debug(res);
        done();
      });
  });
});

describe('Test case for Trigger on Update Activiti [ workflow dependent ] - approved', function callback() {
  this.timeout(10000);
  var testVars = {};
  var modelName = 'Activiti_TestingM2';

  it('should create testing model - ' + modelName, function callback(done) {
    var postData = {
      'name': modelName,
      'base': 'BaseEntity',
      'idInjection': true,
      'options': {
        'validateUpsert': true
      },
      'mixins': {
      },
      'properties': {
        'luckydraw': {
          'type': 'string',
          'required': false
        }
      },
      'relations': {
      },
      'validations': []
    };


    models.ModelDefinition.create(postData, User1Context, function callback(err, res) {
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


  it('should attach workflow to ' + modelName, function callback(done) {
    var attachWorkflowDef = {
      'modelName': modelName,
      'workflowBody': {
        'processDefinitionId': 'escalationExample:1:36'
      },
      'operation': 'update',
      'wfDependent': true
    };

    models.ActivitiManager.attachWorkflow(attachWorkflowDef
      , User1Context, function cb(err, res) {
        if (err) {
          log.error(err);
          return done(err);
        }
        log.debug(res);
        done();
      });
  });

  it('create an instance of ' + modelName, function callback(done) {
    models[modelName].create({
      'luckydraw': '00000'
    }, User1Context, function cb(err, res) {
      if (err) {
        log.error(err);
        return done(err);
      }
      assert.isNotNull(res.id);
      testVars.instanceId = res.id;
      assert.isNotNull(res._version);
      testVars.modelInstance = res;
      testVars.instanceVersion = res._version;
      log.debug(res);
      done();
    });
  });

  it('update the instance of ' + modelName, function callback(done) {
    models[modelName].upsert({
      'id': testVars.instanceId,
      'luckydraw': '11111',
      '_version': testVars.instanceVersion
    }, User1Context, function cb(err, res) {
      if (err) {
        log.error(err);
        return done(err);
      }
      assert.isNotNull(res._luckydraw);
      assert.equal(res._status, 'private');
      assert.equal(res.luckydraw, '11111');
      assert.isNotNull(res._delta);
      assert.isNotNull(res._delta.luckydraw);
      assert.equal(res._delta.luckydraw, '00000');
      log.debug(res);
      done();
    });
  });

  it('check if workflow instance is up', function callback(done) {
    models[modelName].workflow(testVars.instanceId, User1Context, function callback(err, instance) {
      if (err) {
        log.error(err);
        return done(err);
      } else if (instance === null) {
        err = new Error('No workflow instance found');
        log.error(err);
        return done(err);
      }

      log.debug(instance);
      assert.isNotNull(instance.processDefinitionId);
      testVars._workflowRef = instance.id;
      assert.equal(instance.processDefinitionId, 'escalationExample:1:36');
      done();
    });
  });

  it('findById - user1', function callback(done) {
    models[modelName].findById(testVars.instanceId
      , User1Context, function cb(err, res) {
        if (err) {
          log.error(err);
          return done(err);
        }
        log.debug(res);
        testVars.instanceVersion = res._version;
        done();
      });
  });

  it('findById - user2', function callback(done) {
    models[modelName].findById(testVars.instanceId
      , User2Context, function cb(err, res) {
        if (err) {
          log.error(err);
          return done(err);
        }
        log.debug(res);
        done();
      });
  });

  it('findById [REST] - user1', function callback(done) {
    bootstrap.login(User1Credentials, function callback(err, login) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(login.id);
      var token = login.id;

      var url = bootstrap.basePath + '/' + modelName + 's/' + testVars.instanceId + '?access_token=' + token;

      request({ url: url, method: 'GET' }, onGet);

      function onGet(err, response) {
        if (err) {
          return done(err);
        }
        var instance = JSON.parse(response.body);
        assert.strictEqual( response.statusCode, 200);
        log.debug(instance);
        done();
      }
    });
  });

  it('findById [REST] - user2', function callback(done) {
    bootstrap.login(User2Credentials, function callback(err, login) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(login.id);
      var token = login.id;

      var url = bootstrap.basePath + '/' + modelName + 's/' + testVars.instanceId + '?access_token=' + token;

      request({ url: url, method: 'GET'}, onGet);

      function onGet(err, response) {
        if (err) {
          return done(err);
        }
        var instance = JSON.parse(response.body);
        log.debug(instance);
        assert.strictEqual( response.statusCode, 200);
        done();
      }
    });
  });

  it('should not be able to delete instance - user1', function callback(done) {
    models[modelName].deleteWithVersion(testVars.instanceId, testVars.instanceVersion, User1Context, function callback(err, inst) {
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

  it('should not be able to delete instance - user2 (Any other user)', function callback(done) {
    models[modelName].deleteWithVersion(testVars.instanceId, testVars.instanceVersion, User2Context, function callback(err, inst) {
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

  it('end update request [ through activiti ]', function callback(done) {
    models.Activiti_Manager.endAttachWfRequest({
      workflowInstanceId: testVars._workflowRef,
      status: 'approved'
    }, User1Context
      , function cb(err, res) {
        if (err) {
          log.error(err);
          return done(err);
        }
        log.debug(res);
        assert.isNotNull(res);
        done();
      });
  });

  it('findById - user1', function callback(done) {
    models[modelName].findById(testVars.instanceId
      , User1Context, function cb(err, res) {
        if (err) {
          log.error(err);
          return done(err);
        }
        log.debug(res);
        done();
      });
  });

  it('findById - user2', function callback(done) {
    models[modelName].findById(testVars.instanceId
      , User2Context, function cb(err, res) {
        if (err) {
          log.error(err);
          return done(err);
        }
        log.debug(res);
        done();
      });
  });

  it('findById [REST] - user1', function callback(done) {
    bootstrap.login(User1Credentials, function callback(err, login) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(login.id);
      var token = login.id;

      var url = bootstrap.basePath + '/' + modelName + 's/' + testVars.instanceId + '?access_token=' + token;

      request({ url: url, method: 'GET' }, onGet);

      function onGet(err, response) {
        if (err) {
          return done(err);
        }
        var instance = JSON.parse(response.body);
        assert.strictEqual( response.statusCode, 200);
        log.debug(instance);
        done();
      }
    });
  });

  it('findById [REST] - user2', function callback(done) {
    bootstrap.login(User2Credentials, function callback(err, login) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(login.id);
      var token = login.id;

      var url = bootstrap.basePath + '/' + modelName + 's/' + testVars.instanceId + '?access_token=' + token;

      request({ url: url, method: 'GET'}, onGet);

      function onGet(err, response) {
        if (err) {
          return done(err);
        }
        var instance = JSON.parse(response.body);
        log.debug(instance);
        assert.strictEqual( response.statusCode, 200);
        done();
      }
    });
  });

  it('remove model instances [clean-up]', function callback(done) {
    models[modelName].destroyAll({}
      , User1Context, function cb(err, res) {
        if (err) {
          log.error(err);
          return done(err);
        }
        log.debug(res);
        done();
      });
  });

  it('remove model Definition ' + modelName + ' [clean-up]', function callback(done) {
    var id = testVars.modelDetails.id;
    models.ModelDefinition.destroyById(id, User1Context, function callback(err) {
      if (err) {
        done(err);
      } else {
        done();
      }
    });
  });

  it('remove workflow mapping [clean-up]', function callback(done) {
    models.WorkflowMapping.destroyAll({}
      , User1Context, function cb(err, res) {
        if (err) {
          log.error(err);
          return done(err);
        }
        log.debug(res);
        done();
      });
  });
});

describe('Test case for Trigger on Update Activiti [ workflow dependent ] - rejected', function callback() {
  this.timeout(10000);
  var testVars = {};
  var modelName = 'Activiti_TestingM3';

  it('should create testing model - ' + modelName, function callback(done) {
    var postData = {
      'name': modelName,
      'base': 'BaseEntity',
      'idInjection': true,
      'options': {
        'validateUpsert': true
      },
      'mixins': {
      },
      'properties': {
        'luckydraw': {
          'type': 'string',
          'required': false
        }
      },
      'relations': {
      },
      'validations': []
    };


    models.ModelDefinition.create(postData, User1Context, function callback(err, res) {
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


  it('should attach workflow to ' + modelName, function callback(done) {
    var attachWorkflowDef = {
      'modelName': modelName,
      'workflowBody': {
        'processDefinitionId': 'escalationExample:1:36'
      },
      'operation': 'update',
      'wfDependent': true
    };

    models.ActivitiManager.attachWorkflow(attachWorkflowDef
      , bootstrap.defaultContext, function cb(err, res) {
        if (err) {
          log.error(err);
          return done(err);
        }
        log.debug(res);
        done();
      });
  });

  it('create an instance of ' + modelName, function callback(done) {
    models[modelName].create({
      'luckydraw': '00000'
    }, User1Context, function cb(err, res) {
      if (err) {
        log.error(err);
        return done(err);
      }
      assert.isNotNull(res.id);
      testVars.instanceId = res.id;
      assert.isNotNull(res._version);
      testVars.modelInstance = res;
      testVars.instanceVersion = res._version;
      log.debug(res);
      done();
    });
  });

  it('update the instance of ' + modelName, function callback(done) {
    models[modelName].upsert({
      'id': testVars.instanceId,
      'luckydraw': '11111',
      '_version': testVars.instanceVersion
    }, User1Context, function cb(err, res) {
      if (err) {
        log.error(err);
        return done(err);
      }
      assert.equal(res._status, 'private');
      assert.equal(res.luckydraw, '11111');
      assert.isNotNull(res._delta);
      assert.isNotNull(res._delta.luckydraw);
      assert.equal(res._delta.luckydraw, '00000');
      log.debug(res);
      done();
    });
  });

  it('check if workflow instance is up', function callback(done) {
    models[modelName].workflow(testVars.instanceId, User1Context, function callback(err, instance) {
      if (err) {
        log.error(err);
        return done(err);
      } else if (instance === null) {
        err = new Error('No workflow instance found');
        log.error(err);
        return done(err);
      }

      log.debug(instance);
      assert.isNotNull(instance.processDefinitionId);
      testVars._workflowRef = instance.id;
      assert.equal(instance.processDefinitionId, 'escalationExample:1:36');
      done();
    });
  });

  it('findById - user1', function callback(done) {
    models[modelName].findById(testVars.instanceId
      , User1Context, function cb(err, res) {
        if (err) {
          log.error(err);
          return done(err);
        }
        log.debug(res);
        done();
      });
  });

  it('findById - user2', function callback(done) {
    models[modelName].findById(testVars.instanceId
      , User2Context, function cb(err, res) {
        if (err) {
          log.error(err);
          return done(err);
        }
        log.debug(res);
        done();
      });
  });

  it('findById [REST] - user1', function callback(done) {
    bootstrap.login(User1Credentials, function callback(err, login) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(login.id);
      var token = login.id;

      var url = bootstrap.basePath + '/' + modelName + 's/' + testVars.instanceId + '?access_token=' + token;

      request({ url: url, method: 'GET' }, onGet);

      function onGet(err, response) {
        if (err) {
          return done(err);
        }
        var instance = JSON.parse(response.body);
        assert.strictEqual( response.statusCode, 200);
        log.debug(instance);
        done();
      }
    });
  });

  it('findById [REST] - user2', function callback(done) {
    bootstrap.login(User2Credentials, function callback(err, login) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(login.id);
      var token = login.id;

      var url = bootstrap.basePath + '/' + modelName + 's/' + testVars.instanceId + '?access_token=' + token;

      request({ url: url, method: 'GET'}, onGet);

      function onGet(err, response) {
        if (err) {
          return done(err);
        }
        var instance = JSON.parse(response.body);
        log.debug(instance);
        assert.strictEqual( response.statusCode, 200);
        done();
      }
    });
  });

  it('end update request [ through activiti ]', function callback(done) {
    models.Activiti_Manager.endAttachWfRequest({
      workflowInstanceId: testVars._workflowRef,
      status: 'rejected'
    }, User1Context
      , function cb(err, res) {
        if (err) {
          log.error(err);
          return done(err);
        }
        log.debug(res);
        assert.isNotNull(res);
        done();
      });
  });

  it('findById - user1', function callback(done) {
    models[modelName].findById(testVars.instanceId
      , User1Context, function cb(err, res) {
        if (err) {
          log.error(err);
          return done(err);
        }
        log.debug(res);
        done();
      });
  });

  it('findById - user2', function callback(done) {
    models[modelName].findById(testVars.instanceId
      , User2Context, function cb(err, res) {
        if (err) {
          log.error(err);
          return done(err);
        }
        log.debug(res);
        done();
      });
  });

  it('findById [REST] - user1', function callback(done) {
    bootstrap.login(User1Credentials, function callback(err, login) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(login.id);
      var token = login.id;

      var url = bootstrap.basePath + '/' + modelName + 's/' + testVars.instanceId + '?access_token=' + token;

      request({ url: url, method: 'GET' }, onGet);

      function onGet(err, response) {
        if (err) {
          return done(err);
        }
        var instance = JSON.parse(response.body);
        assert.strictEqual( response.statusCode, 200);
        log.debug(instance);
        done();
      }
    });
  });

  it('findById [REST] - user2', function callback(done) {
    bootstrap.login(User2Credentials, function callback(err, login) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(login.id);
      var token = login.id;

      var url = bootstrap.basePath + '/' + modelName + 's/' + testVars.instanceId + '?access_token=' + token;

      request({ url: url, method: 'GET'}, onGet);

      function onGet(err, response) {
        if (err) {
          return done(err);
        }
        var instance = JSON.parse(response.body);
        log.debug(instance);
        assert.strictEqual( response.statusCode, 200);
        done();
      }
    });
  });

  it('remove model instances [clean-up]', function callback(done) {
    models[modelName].destroyAll({}
      , User1Context, function cb(err, res) {
        if (err) {
          log.error(err);
          return done(err);
        }
        log.debug(res);
        done();
      });
  });

  it('remove model Definition ' + modelName + ' [clean-up]', function callback(done) {
    var id = testVars.modelDetails.id;
    models.ModelDefinition.destroyById(id, User1Context, function callback(err) {
      if (err) {
        done(err);
      } else {
        done();
      }
    });
  });

  it('remove workflow mapping [clean-up]', function callback(done) {
    models.WorkflowMapping.destroyAll({}
      , User1Context, function cb(err, res) {
        if (err) {
          log.error(err);
          return done(err);
        }
        log.debug(res);
        done();
      });
  });
});

describe('Test case for Trigger on Update Activiti - Retrigger Case [ workflow dependent ]', function callback() {
  this.timeout(10000);
  var testVars = {};
  var modelName = 'Activiti_TestingM5';

  it('should create testing model - ' + modelName, function callback(done) {
    var postData = {
      'name': modelName,
      'base': 'BaseEntity',
      'idInjection': true,
      'options': {
        'validateUpsert': true
      },
      'mixins': {
        // "SoftDeleteMixin" : false
      },
      'properties': {
        'luckydraw': {
          'type': 'string',
          'required': false
        }
      },
      'relations': {
      },
      'validations': []
    };


    models.ModelDefinition.create(postData, User1Context, function callback(err, res) {
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


  it('should attach workflow to ' + modelName, function callback(done) {
    var attachWorkflowDef = {
      'modelName': modelName,
      'workflowBody': {
        'processDefinitionId': 'escalationExample:1:36'
      },
      'operation': 'update',
      'wfDependent': true
    };

    models.ActivitiManager.attachWorkflow(attachWorkflowDef
      , bootstrap.defaultContext, function cb(err, res) {
        if (err) {
          log.error(err);
          return done(err);
        }
        log.debug(res);
        done();
      });
  });

  it('create an instance of ' + modelName, function callback(done) {
    models[modelName].create({
      'luckydraw': '00000'
    }, User1Context, function cb(err, res) {
      if (err) {
        log.error(err);
        return done(err);
      }
      assert.isNotNull(res.id);
      testVars.instanceId = res.id;
      assert.isNotNull(res._version);
      testVars.modelInstance = res;
      testVars.instanceVersion = res._version;
      log.debug(res);
      done();
    });
  });

  it('update the instance of ' + modelName, function callback(done) {
    models[modelName].upsert({
      'id': testVars.instanceId,
      'luckydraw': '11111',
      '_version': testVars.instanceVersion
    }, User1Context, function cb(err, res) {
      if (err) {
        log.error(err);
        return done(err);
      }
      assert.isNotNull(res._status);
      assert.equal(res._status, 'private');
      assert.equal(res.luckydraw, '11111');
      assert.isNotNull(res._delta);
      assert.isNotNull(res._delta.luckydraw);
      assert.equal(res._delta.luckydraw, '00000');
      testVars.modelInstance = res;
      testVars.instanceVersion = res._version;
      log.debug(res);
      done();
    });
  });

  it('check if workflow instance is up', function callback(done) {
    models[modelName].workflow(testVars.instanceId, User1Context, function callback(err, instance) {
      if (err) {
        log.error(err);
        return done(err);
      } else if (instance === null) {
        err = new Error('No workflow instance found');
        log.error(err);
        return done(err);
      }

      log.debug(instance);
      assert.isNotNull(instance.processDefinitionId);
      testVars._workflowRef = instance.id;
      assert.equal(instance.processDefinitionId, 'escalationExample:1:36');
      done();
    });
  });

  it('findById - user1', function callback(done) {
    models[modelName].findById(testVars.instanceId
      , User1Context, function cb(err, res) {
        if (err) {
          log.error(err);
          return done(err);
        }
        log.debug(res);
        done();
      });
  });

  it('findById - user2', function callback(done) {
    models[modelName].findById(testVars.instanceId
      , User2Context, function cb(err, res) {
        if (err) {
          log.error(err);
          return done(err);
        }
        log.debug(res);
        done();
      });
  });

  it('findById [REST] - user1', function callback(done) {
    bootstrap.login(User1Credentials, function callback(err, login) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(login.id);
      var token = login.id;

      var url = bootstrap.basePath + '/' + modelName + 's/' + testVars.instanceId + '?access_token=' + token;

      request({ url: url, method: 'GET' }, onGet);

      function onGet(err, response) {
        if (err) {
          return done(err);
        }
        var instance = JSON.parse(response.body);
        assert.strictEqual( response.statusCode, 200);
        log.debug(instance);
        done();
      }
    });
  });

  it('findById [REST] - user2', function callback(done) {
    bootstrap.login(User2Credentials, function callback(err, login) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(login.id);
      var token = login.id;

      var url = bootstrap.basePath + '/' + modelName + 's/' + testVars.instanceId + '?access_token=' + token;

      request({ url: url, method: 'GET'}, onGet);

      function onGet(err, response) {
        if (err) {
          return done(err);
        }
        var instance = JSON.parse(response.body);
        log.debug(instance);
        assert.strictEqual( response.statusCode, 200);
        done();
      }
    });
  });

  it('re-update the instance of ' + modelName, function callback(done) {
    models[modelName].upsert({
      'id': testVars.instanceId,
      'luckydraw': '22222',
      '_version': testVars.instanceVersion
    }, User1Context, function cb(err, res) {
      if (err) {
        log.error(err);
        return done(err);
      }
      assert.isNotNull(res._status);
      assert.equal(res._status, 'private');
      assert.equal(res.luckydraw, '22222');
      assert.isNotNull(res._delta);
      assert.isNotNull(res._delta.luckydraw);
      assert.equal(res._delta.luckydraw, '00000');
      log.debug(res);
      setTimeout(done, 2000);
    });
  });

  it('check if workflow instance is up', function callback(done) {
    models[modelName].workflow(testVars.instanceId, User1Context, function callback(err, instance) {
      if (err) {
        log.error(err);
        return done(err);
      } else if (instance === null) {
        err = new Error('No workflow instance found');
        log.error(err);
        return done(err);
      }

      log.debug(instance);
      testVars._workflowRefNew = instance.id;
      assert.isNotNull(instance.processDefinitionId);
      assert.equal(instance.processDefinitionId, 'escalationExample:1:36');
      done();
    });
  });

  it('check if previous workflow instance is down', function callback(done) {
    models.Activiti_ProcessInstance.getById(testVars._workflowRef, User1Context
      , function cb(err, res) {
        if (err) {
          log.error(err);
          return done(err);
        }
        log.debug(res);
        assert.isNotNull(res);
        assert.equal(res.processDefinitionId, 'escalationExample:1:36');
        assert.equal(res.suspended, true);
        done();
      });
  });

  it('findById - user1', function callback(done) {
    models[modelName].findById(testVars.instanceId
      , User1Context, function cb(err, res) {
        if (err) {
          log.error(err);
          return done(err);
        }
        log.debug(res);
        done();
      });
  });

  it('findById - user2', function callback(done) {
    models[modelName].findById(testVars.instanceId
      , User2Context, function cb(err, res) {
        if (err) {
          log.error(err);
          return done(err);
        }
        log.debug(res);
        done();
      });
  });

  it('findById [REST] - user1', function callback(done) {
    bootstrap.login(User1Credentials, function callback(err, login) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(login.id);
      var token = login.id;

      var url = bootstrap.basePath + '/' + modelName + 's/' + testVars.instanceId + '?access_token=' + token;

      request({ url: url, method: 'GET' }, onGet);

      function onGet(err, response) {
        if (err) {
          return done(err);
        }
        var instance = JSON.parse(response.body);
        assert.strictEqual( response.statusCode, 200);
        log.debug(instance);
        done();
      }
    });
  });

  it('findById [REST] - user2', function callback(done) {
    bootstrap.login(User2Credentials, function callback(err, login) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(login.id);
      var token = login.id;

      var url = bootstrap.basePath + '/' + modelName + 's/' + testVars.instanceId + '?access_token=' + token;

      request({ url: url, method: 'GET'}, onGet);

      function onGet(err, response) {
        if (err) {
          return done(err);
        }
        var instance = JSON.parse(response.body);
        log.debug(instance);
        assert.strictEqual( response.statusCode, 200);
        done();
      }
    });
  });

  it('end update request [ through activiti ]', function callback(done) {
    models.Activiti_Manager.endAttachWfRequest({
      workflowInstanceId: testVars._workflowRefNew,
      status: 'approved'
    }, User1Context
      , function cb(err, res) {
        if (err) {
          log.error(err);
          return done(err);
        }
        log.debug(res);
        assert.isNotNull(res);
        done();
      });
  });

  it('remove model instances [clean-up]', function callback(done) {
    models[modelName].destroyAll({}
      , User1Context, function cb(err, res) {
        if (err) {
          log.error(err);
          return done(err);
        }
        log.debug(res);
        done();
      });
  });

  it('remove model Definition ' + modelName + ' [clean-up]', function callback(done) {
    var id = testVars.modelDetails.id;
    models.ModelDefinition.destroyById(id, User1Context, function callback(err) {
      if (err) {
        done(err);
      } else {
        done();
      }
    });
  });

  it('remove workflow mapping [clean-up]', function callback(done) {
    models.WorkflowMapping.destroyAll({}
      , User1Context, function cb(err, res) {
        if (err) {
          log.error(err);
          return done(err);
        }
        log.debug(res);
        done();
      });
  });
});
