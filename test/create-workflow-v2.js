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
var User2Credentials = {
  'username': 'user2',
  'password': 'user2'
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

describe('Test case for Trigger on Create OE Workflow [ workflow dependent ] - approved', function CB() {
  this.timeout(15000);
  var modelName = 'TestCWM1';
  var wfName = 'maker-checker-generic';
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
      if (bootstrap.checkDuplicateKeyError(err)) {
        done();
      }          else {
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
      'version': 'v2'
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
    models[modelName].createX({
      'luckydraw': '00000'
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
    models[modelName].findX(testVars.instanceId, User1Context, function cb(err, instance) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(instance);
      done();
    });
  });

  it('findById - user2', function CB(done) {
    models[modelName].findX(testVars.instanceId, User2Context, function cb(err, instance) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(instance);
      done();
    });
  });

  it('findById [REST] - user1', function CB(done) {
    bootstrap.login(User1Credentials, function CB(err, login) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(login.id);

      var url = bootstrap.basePath + '/' + modelName + 's/maker-checker/' + testVars.instanceId + '/?access_token=' + bootstrap.token;

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

  it('findById [REST] - user2', function CB(done) {
    bootstrap.login(User2Credentials, function CB(err, login) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(login.id);

      var url = bootstrap.basePath + '/' + modelName + 's/maker-checker/' + testVars.instanceId + '/?access_token=' + bootstrap.token;

      request({ url: url, method: 'GET' }, onGet);

      function onGet(err, response) {
        if (err) {
          return done(err);
        }
        var instance = JSON.parse(response.body);
        log.debug(instance);
        done();
      }
    });
  });

  xit('should not be able to update instance [UpdateAttributes/PUT by Id] - user1', function CB(done) {
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

  xit('should not be able to update instance [UpdateAttributes/PUT by Id]- user2 (Any Other User)', function CB(done) {
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

  xit('should not be able to update instance [Upsert/PUT] - user1', function CB(done) {
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

  xit('should not be able to update instance [Upsert/PUT]- user2 (Any Other User)', function CB(done) {
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

  // till delete part is updated by user2 - user1
  xit('should not be able to delete instance - user1', function CB(done) {
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

  xit('should not be able to delete instance - user2 (Any other user)', function CB(done) {
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

  it('complete user task by checker', function CB(done) {
    testVars.taskInstance.complete({
      pv: {
        '_action': 'approved'
      }
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

  xit('end create request [ through OE Workflow ]', function CB(done) {
    models.WorkflowManager.endAttachWfRequest({
      workflowInstanceId: testVars._workflowRef,
      version: 'v2',
      status: 'approved'
    }, User1Context, function cb(err, res) {
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
    models[modelName].findX(testVars.instanceId, User1Context, function cb(err, instance) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(instance);
      done();
    });
  });

  it('findById - user2', function CB(done) {
    models[modelName].findX(testVars.instanceId, User2Context, function cb(err, instance) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(instance);
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

      var url = bootstrap.basePath + '/' + modelName + 's/maker-checker/' + testVars.instanceId + '?access_token=' + bootstrap.token;

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

  it('findById [REST] - user2', function CB(done) {
    bootstrap.login(User2Credentials, function CB(err, login) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(login.id);

      var url = bootstrap.basePath + '/' + modelName + 's/maker-checker/' + testVars.instanceId + '?access_token=' + bootstrap.token;

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

  xit('remove model instances [clean-up]', function CB(done) {
    models[modelName].destroyAll({}, User1Context, function cb(err, res) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(res);
      done();
    });
  });

  xit('remove model Definition ' + modelName + ' [clean-up]', function CB(done) {
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

  xit('remove workflow mapping [clean-up]', function CB(done) {
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
  var modelName = 'TestCWM2';
  var wfName = 'maker-checker-generic';
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
      'wfDependent': true,
      'version': 'v2'
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
    models[modelName].createX({
      'luckydraw': '00000'
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
      done();
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
    models[modelName].findX(testVars.instanceId, User1Context, function cb(err, instance) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(instance);
      done();
    });
  });

  it('findById - user2', function CB(done) {
    models[modelName].findX(testVars.instanceId, User2Context, function cb(err, instance) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(instance);
      done();
    });
  });

  xit('findById [REST] - user1', function CB(done) {
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

      var url = bootstrap.basePath + '/' + modelName + 's/maker-checker/' + testVars.instanceId + '?access_token=' + bootstrap.token;

      request({ url: url, method: 'GET' }, onGet);

      function onGet(err, response) {
        if (err) {
          return done(err);
        }
        var instance = JSON.parse(response.body);
        log.debug(instance);
        done();
      }
    });
  });

  xit('should not be able to update instance [UpdateAttributes/PUT by Id] - user1', function CB(done) {
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

  xit('should not be able to update instance [UpdateAttributes/PUT by Id]- user2 (Any Other User)', function CB(done) {
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

  xit('should not be able to update instance [Upsert/PUT] - user1', function CB(done) {
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

  xit('should not be able to update instance [Upsert/PUT]- user2 (Any Other User)', function CB(done) {
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

  // till delete part is updated by user2 - user1
  xit('should not be able to delete instance - user1', function CB(done) {
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

  xit('should not be able to delete instance - user2 (Any other user)', function CB(done) {
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

  it('complete user task by checker', function CB(done) {
    testVars.taskInstance.complete({
      pv: {
        '_action': 'rejected'
      }
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

  xit('end create request [ through OE Workflow ]', function CB(done) {
    models.WorkflowManager.endAttachWfRequest({
      workflowInstanceId: testVars._workflowRef,
      version: 'v2',
      status: 'rejected'
    }, User1Context, function cb(err, res) {
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
    models[modelName].findX(testVars.instanceId, User1Context, function cb(err, instance) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(instance);
      done();
    });
  });

  it('findById - user2', function CB(done) {
    models[modelName].findX(testVars.instanceId, User2Context, function cb(err, instance) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(instance);
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

      var url = bootstrap.basePath + '/' + modelName + 's/maker-checker/' + testVars.instanceId + '?access_token=' + bootstrap.token;

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

  it('findById [REST] - user2', function CB(done) {
    bootstrap.login(User2Credentials, function CB(err, login) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(login.id);

      var url = bootstrap.basePath + '/' + modelName + 's/maker-checker/' + testVars.instanceId + '?access_token=' + bootstrap.token;

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

  xit('remove model instances [clean-up]', function CB(done) {
    models[modelName].destroyAll({}, User1Context, function cb(err, res) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(res);
      done();
    });
  });

  xit('remove model Definition ' + modelName + ' [clean-up]', function CB(done) {
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

  xit('remove workflow mapping [clean-up]', function CB(done) {
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
