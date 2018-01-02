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
var User3Context = {
  ctx: {
    'tenantId': 'default',
    'remoteUser': 'user3',
    'username': 'user3'
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
var User3Details = {
  'username': 'user3',
  'email': 'user3@oe.com',
  'password': 'user3',
  'id': 'user3'
};
var User1Credentials = {
  'username': 'user1',
  'password': 'user1'
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
  it('should create user - user3', function CB(done) {
    BaseUser.create(User3Details, bootstrap.defaultContext, function CB(err, users) {
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

describe('Test case for Implicit POST scenario', function callback() {
  this.timeout(35000);
  var BaseModel = 'Person02';
  var modelName = 'Person02';
  var RelatedModel = 'Mobile02';
  var wfName = 'sm-sc';
  var testVars = {};

  it('should create testing model - ' + BaseModel, function callback(done) {
    var postData = {
      'name': BaseModel,
      'base': 'BaseEntity',
      'idInjection': true,
      'options': {
        'validateUpsert': true
      },
      'strict': true,
      'properties': {
        'name': {
          'type': 'string',
          'required': false
        },
        '_verifiedBy': {
          'type': 'string',
          'required': false
        }
      },
      'relations': {
        'mobiles': {
          'type': 'hasMany',
          'model': RelatedModel
        }
      },
      'validations': []
    };


    models.ModelDefinition.create(postData, User1Context, function callback(err, res) {
      if (err) {
        log.error(err);
        done(err);
      } else {
        log.debug(res);
        var modelName = BaseModel;
        expect(models[modelName]).not.to.be.null;
        expect(models[modelName].definition.properties).not.to.be.undefined;
        expect(Object.keys(models[modelName].definition.properties)).to.include.members(Object.keys(models.BaseEntity.definition.properties));
        testVars.BaseModelDetails = res;
        done();
      }
    });
  });

  it('should create testing model - ' + RelatedModel, function callback(done) {
    var postData = {
      'name': RelatedModel,
      'base': 'BaseEntity',
      'idInjection': true,
      'options': {
        'validateUpsert': true
      },
      'strict': true,
      'properties': {
        'num': {
          'type': 'string',
          'required': false
        }
      },
      'relations': {
        'person': {
          'type': 'belongsTo',
          'model': BaseModel
        }
      },
      'validations': []
    };


    models.ModelDefinition.create(postData, User1Context, function callback(err, res) {
      if (err) {
        log.error(err);
        done(err);
      } else {
        log.debug(res);
        var modelName = RelatedModel;
        expect(models[modelName]).not.to.be.null;
        expect(models[modelName].definition.properties).not.to.be.undefined;
        expect(Object.keys(models[modelName].definition.properties)).to.include.members(Object.keys(models.BaseEntity.definition.properties));
        testVars.RelatedModelDetails = res;
        done();
      }
    });
  });

  it('should read the file', function callback(done) {
    fs.readFile(path.resolve('./test/bpmn-files', wfName + '.bpmn'), 'utf8', (err, data) => {
      testVars.xmldata = data;
      done(err);
    });
  });

  it('deploy the WorkflowDefinition', function callback(done) {
    var defData = {'name': wfName, 'xmldata': testVars.xmldata};
    models.WorkflowDefinition.create(defData, bootstrap.defaultContext, function callback(err, res) {
      // Code for duplicate keys
      if (bootstrap.checkDuplicateKeyError(err)) {
        done();
      } else {
        done(err);
      }
    });
  });

  it('should attach workflow to ' + BaseModel, function callback(done) {
    var attachWorkflowDef = {
      'modelName': modelName,
      'workflowBody': {
        'workflowDefinitionName': wfName
      },
      'operation': 'create',
      'version': 'v2'
    };

    models.WorkflowManager.attachWorkflow(attachWorkflowDef
      , bootstrap.defaultContext, function cb(err, res) {
        if (err) {
          log.error(err);
          return done(err);
        }
        log.debug(res);
        return done();
      });
  });

  it('create an instance of ' + modelName + ' : author - user1', function CB(done) {
    models[modelName].createX({
      'name': 'user1',
      'mobiles': [
        {
          'num': '123'
        }, {
          'num': '321'
        }
      ]
    }, User1Context, function cb(err, instance) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(instance);
      testVars.instanceId = instance.id;
      setTimeout(done, 2000);
    });
  });

  it('find instance of ' + modelName + ' via findByIdX : author - user1', function CB(done) {
    models[modelName].findByIdX(testVars.instanceId, User1Context, function cb(err, instance) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(instance);
      assert.strictEqual(instance.name, 'user1');
      assert.strictEqual(instance.mobiles.length, 2);
      assert.strictEqual(instance.mobiles[0].num, '123');
      assert.strictEqual(instance.mobiles[1].num, '321');
      done();
    });
  });

  it('find instance of ' + modelName + ' via findX : author - user1', function CB(done) {
    models[modelName].findX( User1Context, function cb(err, instances) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(instances);
      assert.strictEqual(instances.length, 1);
      let instance = instances[0];
      assert.strictEqual(instance.name, 'user1');
      assert.strictEqual(instance.mobiles.length, 2);
      assert.strictEqual(instance.mobiles[0].num, '123');
      assert.strictEqual(instance.mobiles[1].num, '321');
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
      setTimeout(done, 1000);
    });
  });

  it('check if checker task instance is created', function CB(done) {
    models[modelName].tasks(testVars.instanceId, User3Context, function CB(err, tasks) {
      if (err) {
        log.error(err);
        return done(err);
      } else if (tasks.length === 0) {
        var errNoWinstance = new Error('No task instance found');
        log.error(errNoWinstance);
        return done(errNoWinstance);
      }
      log.debug(tasks);
      testVars.taskInstance = tasks[0];
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

  it('findById [REST] - user1', function CB(done) {
    bootstrap.login(User1Credentials, function CB(err, login) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(login.id);

      var url = bootstrap.basePath + '/' + modelName + 's/' + testVars.instanceId + '/?access_token=' + bootstrap.token;

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

  it('complete user task by checker', function CB(done) {
    testVars.taskInstance.complete({
      '__action__': 'approved'
    }, User3Context, function cb(err, res) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(res);
      assert.isNotNull(res);
      setTimeout(done, 2000);
    });
  });

  it('find instance of ' + modelName + ' via findByIdX : author - user1', function CB(done) {
    models[modelName].findByIdX(testVars.instanceId, User1Context, function cb(err, instance) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(instance);
      assert.isNotNull(instance);
      assert.strictEqual(instance.name, 'user1');
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

  it('remove related model instances [clean-up]', function CB(done) {
    models[RelatedModel].destroyAll({}, User1Context, function cb(err, res) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(res);
      assert.strictEqual(res.count, 2);
      done();
    });
  });

  it('remove model Definition ' + BaseModel + ' [clean-up]', function callback(done) {
    var id = testVars.BaseModelDetails.id;
    var version = testVars.BaseModelDetails._version;
    models.ModelDefinition.deleteWithVersion(id, version, User1Context, function callback(err) {
      if (err) {
        done(err);
      } else {
        done();
      }
    });
  });

  it('remove model Definition ' + RelatedModel + ' [clean-up]', function callback(done) {
    var id = testVars.RelatedModelDetails.id;
    var version = testVars.RelatedModelDetails._version;
    models.ModelDefinition.deleteWithVersion(id, version, User1Context, function callback(err) {
      if (err) {
        done(err);
      } else {
        done();
      }
    });
  });

  it('remove workflow mapping [clean-up]', function callback(done) {
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

describe('Test case for Implicit PUT scenario', function callback() {
  this.timeout(35000);
  var BaseModel = 'Person03';
  var modelName = 'Person03';
  var RelatedModel = 'Mobile03';
  var wfName = 'sm-sc';
  var testVars = {};

  it('should create testing model - ' + BaseModel, function callback(done) {
    var postData = {
      'name': BaseModel,
      'base': 'BaseEntity',
      'idInjection': true,
      'options': {
        'validateUpsert': true
      },
      'strict': true,
      'properties': {
        'name': {
          'type': 'string',
          'required': false
        },
        '_verifiedBy': {
          'type': 'string',
          'required': false
        }
      },
      'relations': {
        'mobiles': {
          'type': 'hasMany',
          'model': RelatedModel
        }
      },
      'validations': []
    };


    models.ModelDefinition.create(postData, User1Context, function callback(err, res) {
      if (err) {
        log.error(err);
        done(err);
      } else {
        log.debug(res);
        var modelName = BaseModel;
        expect(models[modelName]).not.to.be.null;
        expect(models[modelName].definition.properties).not.to.be.undefined;
        expect(Object.keys(models[modelName].definition.properties)).to.include.members(Object.keys(models.BaseEntity.definition.properties));
        testVars.BaseModelDetails = res;
        done();
      }
    });
  });

  it('should create testing model - ' + RelatedModel, function callback(done) {
    var postData = {
      'name': RelatedModel,
      'base': 'BaseEntity',
      'idInjection': true,
      'options': {
        'validateUpsert': true
      },
      'strict': true,
      'properties': {
        'num': {
          'type': 'string',
          'required': false
        },
        'code': {
          'type': 'string',
          'in': [
            '01',
            '02',
            '03'
          ],
          'required': false
        }
      },
      'relations': {
        'person': {
          'type': 'belongsTo',
          'model': BaseModel
        }
      },
      'validations': []
    };


    models.ModelDefinition.create(postData, User1Context, function callback(err, res) {
      if (err) {
        log.error(err);
        done(err);
      } else {
        log.debug(res);
        var modelName = RelatedModel;
        expect(models[modelName]).not.to.be.null;
        expect(models[modelName].definition.properties).not.to.be.undefined;
        expect(Object.keys(models[modelName].definition.properties)).to.include.members(Object.keys(models.BaseEntity.definition.properties));
        testVars.RelatedModelDetails = res;
        done();
      }
    });
  });

  it('should read the file', function callback(done) {
    fs.readFile(path.resolve('./test/bpmn-files', wfName + '.bpmn'), 'utf8', (err, data) => {
      testVars.xmldata = data;
      done(err);
    });
  });

  it('deploy the WorkflowDefinition', function callback(done) {
    var defData = {'name': wfName, 'xmldata': testVars.xmldata};
    models.WorkflowDefinition.create(defData, bootstrap.defaultContext, function callback(err, res) {
      // Code for duplicate keys
      if (bootstrap.checkDuplicateKeyError(err)) {
        done();
      } else {
        done(err);
      }
    });
  });

  it('should attach workflow to ' + BaseModel, function callback(done) {
    var attachWorkflowDef = {
      'modelName': modelName,
      'workflowBody': {
        'workflowDefinitionName': wfName
      },
      'operation': 'update',
      'version': 'v2'
    };

    models.WorkflowManager.attachWorkflow(attachWorkflowDef
      , bootstrap.defaultContext, function cb(err, res) {
        if (err) {
          log.error(err);
          return done(err);
        }
        log.debug(res);
        return done();
      });
  });

  it('create an instance of ' + modelName + ' : author - user1', function CB(done) {
    models[modelName].create({
      'name': 'user1',
      'mobiles': [
        {
          'id': '123',
          'num': '123'
        }, {
          'id': '321',
          'num': '321'
        }
      ]
    }, User1Context, function cb(err, instance) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(instance);
      testVars.instanceId = instance.id;
      testVars.instanceVersion = instance._version;
      setTimeout(done, 2000);
    });
  });

  it('find instance of ' + modelName + ' via findByIdX : author - user1', function CB(done) {
    models[modelName].findById(testVars.instanceId, User1Context, function cb(err, instance) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(instance);
      assert.strictEqual(instance.name, 'user1');
      done();
    });
  });

  it('find instance of ' + modelName + ' via findByIdX : author - user1', function CB(done) {
    models[modelName].find({
      where: {
        name: 'user1'
      },
      include: 'mobiles'
    }, User1Context, function cb(err, instances) {
      if (err) {
        log.error(err);
        return done(err);
      }
      let instance = instances[0].toObject(true);
      log.debug(instance);
      assert.strictEqual(instance.name, 'user1');
      assert.strictEqual(instance.mobiles.length, 2);
      assert.strictEqual(instance.mobiles[0].num, '123');
      assert.strictEqual(instance.mobiles[1].num, '321');
      done();
    });
  });

  it('update an instance of ' + modelName + ' : author - user1', function CB(done) {
    models[modelName].updateX(testVars.instanceId, {
      'name': 'user1_mod',
      'mobiles': [
        {
          'id': '123',
          'code': '01',
          '__row_status': 'modified'
        }, {
          'id': '111',
          'num': '111',
          'code': '01',
          '__row_status': 'added'
        }, {
          'id': '321',
          'code': '01',
          '__row_status': 'deleted'
        }
      ],
      '_version': testVars.instanceVersion
    }, User1Context, function cb(err, instance) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(instance);
      testVars.instanceId = instance.id;
      setTimeout(done, 2000);
    });
  });

  it('find instance of ' + modelName + ' via findByIdX : author - user1', function CB(done) {
    models[modelName].findByIdX(testVars.instanceId, User1Context, function cb(err, instance) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(instance);
      assert.strictEqual(instance.name, 'user1_mod');
      assert.strictEqual(instance.mobiles.length, 3);
      assert.strictEqual(instance.mobiles[0].num, '123');
      assert.strictEqual(instance.mobiles[0].code, '01');
      assert.strictEqual(instance.mobiles[1].num, '111');
      assert.strictEqual(instance.mobiles[1].code, '01');
      assert.strictEqual(instance.mobiles[2].code, '01');
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
      setTimeout(done, 1000);
    });
  });

  it('check if checker task instance is created', function CB(done) {
    models[modelName].tasks(testVars.instanceId, User3Context, function CB(err, tasks) {
      if (err) {
        log.error(err);
        return done(err);
      } else if (tasks.length === 0) {
        var errNoWinstance = new Error('No task instance found');
        log.error(errNoWinstance);
        return done(errNoWinstance);
      }
      log.debug(tasks);
      testVars.taskInstance = tasks[0];
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
      assert.strictEqual(instance.name, 'user1');
      done();
    });
  });

  it('findById [REST] - user1', function CB(done) {
    bootstrap.login(User1Credentials, function CB(err, login) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(login.id);

      var url = bootstrap.basePath + '/' + modelName + 's/' + testVars.instanceId + '/?access_token=' + bootstrap.token;

      request({ url: url, method: 'GET' }, onGet);

      function onGet(err, response) {
        if (err) {
          return done(err);
        }
        var instance = JSON.parse(response.body);
        assert.strictEqual(response.statusCode, 200);
        log.debug(instance);
        done();
      }
    });
  });

  it('complete user task by checker', function CB(done) {
    testVars.taskInstance.complete({
      '__action__': 'approved'
    }, User3Context, function cb(err, res) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(res);
      assert.isNotNull(res);
      setTimeout(done, 2000);
    });
  });

  it('find instance of ' + modelName + ' via findByIdX : author - user1', function CB(done) {
    models[modelName].findByIdX(testVars.instanceId, User1Context, function cb(err, instance) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(instance);
      assert.isNotNull(instance);
      assert.strictEqual(instance.name, 'user1_mod');
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
        done();
      }
    });
  });

  // it('remove model instances [clean-up]', function CB(done) {
  //   models[modelName].destroyAll({}, User1Context, function cb(err, res) {
  //     if (err) {
  //       log.error(err);
  //       return done(err);
  //     }
  //     log.debug(res);
  //     done();
  //   });
  // });

  // it('remove related model instances [clean-up]', function CB(done) {
  //   models[RelatedModel].destroyAll({}, User1Context, function cb(err, res) {
  //     if (err) {
  //       log.error(err);
  //       return done(err);
  //     }
  //     log.debug(res);
  //     assert.strictEqual(res.count, 2);
  //     done();
  //   });
  // });

  it('remove model Definition ' + BaseModel + ' [clean-up]', function callback(done) {
    var id = testVars.BaseModelDetails.id;
    var version = testVars.BaseModelDetails._version;
    models.ModelDefinition.deleteWithVersion(id, version, User1Context, function callback(err) {
      if (err) {
        done(err);
      } else {
        done();
      }
    });
  });

  it('remove model Definition ' + RelatedModel + ' [clean-up]', function callback(done) {
    var id = testVars.RelatedModelDetails.id;
    var version = testVars.RelatedModelDetails._version;
    models.ModelDefinition.deleteWithVersion(id, version, User1Context, function callback(err) {
      if (err) {
        done(err);
      } else {
        done();
      }
    });
  });

  it('remove workflow mapping [clean-up]', function callback(done) {
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
