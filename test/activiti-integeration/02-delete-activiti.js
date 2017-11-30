/**
*
* ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
* Bangalore, India. All Rights Reserved.
*
*/
var request = require('request');
var _ = require('lodash');

var bootstrap = require('../bootstrap');
var chai = bootstrap.chai;
var expect = chai.expect;
var assert = chai.assert;
var models = bootstrap.models;
var log = bootstrap.log();

var User1ContextGlobal = {
  ctx: {
    'tenantId': 'default',
    'remoteUser': 'user1',
    'username': 'user1'
  }
};
var User2ContextGlobal = {
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
         // log.debug(users);
        done();
      } else if (err) {
         // log.error(err);
        return done(err);
      } else {
         // log.debug(users);
        assert.isNotNull(users);
        done();
      }
    });
  });
});

describe('Test case for Trigger on Delete Activiti [ not workflow dependent ]', function CB() {
  this.timeout(10000);
  var testVars = {};
  var modelName = 'ActivitiTester1';
  var User1Context = _.cloneDeep(User1ContextGlobal);
  var User2Context = _.cloneDeep(User2ContextGlobal);

  var modelNamePlural = modelName + 's';

  it('should create testing model - ' + modelName, function CB(done) {
    var postData = {
      'name': modelName,
      'base': 'BaseEntity',
      'plural': modelNamePlural,
      'idInjection': true,
      'options': {
        'validateUpsert': true
      },
      'strict': true,
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


  it('should attach workflow to ' + modelName, function CB(done) {
    var attachWorkflowDef = {
      'modelName': modelName,
      'workflowBody': {
        'processDefinitionId': 'escalationExample:1:33'
      },
      'operation': 'delete',
      'wfDependent': false
    };

    models.ActivitiManager.attachWorkflow(attachWorkflowDef, User1Context, function cb(err, res) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(res);
      // done();
      setTimeout(done, 1000);
    });
  });

  it('create an instance of ' + modelName, function CB(done) {
    models[modelName].create({
      'luckydraw': '12345'
    }, User1Context, function cb(err, res) {
      if (err) {
        log.error(err);
        return done(err);
      }
      assert.isNotNull(res.id);
      testVars.instanceId = res.id.toString();
      assert.isNotNull(res._version);
      testVars.modelInstance = res;
      testVars.instanceVersion = res._version;
      log.debug(res);
      done();
    });
  });

  it('Delete the instance of ' + modelName, function CB(done) {
    models[modelName].deleteWithVersion(
         testVars.instanceId,
         testVars.instanceVersion,
         User1Context, function cb(err, res) {
           if (err) {
             log.error(err);
             done(err);
           } else {
             log.debug(res, true);
             assert.equal(res.count, 1);
             done();
   // setTimeout(done,2000);
           }
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
      assert.isNotNull(instance.processDefinitionId);
      testVars._workflowRef = instance.id;
      assert.equal(instance.processDefinitionId, 'escalationExample:1:33');
      done();
    });
  });

  it('findById - user1', function CB(done) {
    models[modelName].findById(testVars.instanceId
         , User1Context, function cb(err, res) {
           if (err) {
             log.error(err);
             return done(err);
           }
           log.debug(res);
           assert.isNull(res);
           done();
         });
  });

  it('findById - user2', function CB(done) {
    models[modelName].findById(testVars.instanceId
         , User2Context, function cb(err, res) {
           if (err) {
             log.error(err);
             return done(err);
           }
           log.debug(res);
           assert.isNull(res);
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

      request({ url: url, method: 'GET'}, onGet);

      function onGet(err, response) {
        if (err) {
          return done(err);
        }
        var instance = JSON.parse(response.body);
        assert.strictEqual( response.statusCode, 404);
        log.debug(instance);
        done();
      }
    });
  });

  it('findById [REST] - user2', function CB(done) {
    bootstrap.login(User1Credentials, function CB(err, login) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(login.id);

      var url = bootstrap.basePath + '/' + modelName + 's/' + testVars.instanceId + '?access_token=' + bootstrap.token;

      request({ url: url, method: 'GET'}, onGet);

      function onGet(err, response) {
        if (err) {
          return done(err);
        }
        var instance = JSON.parse(response.body);
        assert.strictEqual( response.statusCode, 404);
        log.debug(instance);
        done();
      }
    });
  });

  it('remove model Definition ' + modelName + ' [clean-up]', function CB(done) {
    var id = testVars.modelDetails.id;
    models.ModelDefinition.destroyById(id, User1Context, function CB(err) {
      if (err) {
        done(err);
      } else {
        done();
      }
    });
  });

  it('remove workflow mapping [clean-up]', function CB(done) {
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

describe('Test case for Trigger on Delete Activiti [ workflow dependent ] - Approved', function CB() {
  this.timeout(10000);
  var User1Context = _.cloneDeep(User1ContextGlobal);
  var User2Context = _.cloneDeep(User2ContextGlobal);
  var testVars = {};
  var modelName = 'ActivitiTester';
  var modelNamePlural = modelName + 's';
  it('should create testing model - [Approved]' + modelName, function CB(done) {
    var postData = {
      'name': modelName,
      'plural': modelNamePlural,
      'base': 'BaseEntity',
      'idInjection': true,
      'options': {
        'validateUpsert': true
      },
      'strict': true,
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


  it('should attach workflow to [Approved]' + modelName, function CB(done) {
    var attachWorkflowDef = {
      'modelName': modelName,
      'workflowBody': {
        'processDefinitionId': 'escalationExample:1:33'
      },
      'operation': 'delete',
      'wfDependent': true
    };

    models.ActivitiManager.attachWorkflow(attachWorkflowDef, User1Context, function cb(err, res) {
      if (err) {
        log.error(err);
        return done(err);
      }
      // log.debug(res);
      done();
         // setTimeout(done,2000);
    });
  });

  it('create an instance of [Approved]' + modelName, function CB(done) {
    models[modelName].create({
      'luckydraw': '12345'
    }, User1Context, function cb(err, res) {
      if (err) {
        log.error(err);
        return done(err);
      }
      assert.isNotNull(res.id);
      testVars.instanceId = res.id.toString();
      assert.isNotNull(res._version);
      testVars.modelInstance = res;
      testVars.instanceVersion = res._version;
      log.debug(res);
      done();
    });
  });

  it('Delete the instance of [Approved]' + modelName, function CB(done) {
    models[modelName].deleteWithVersion(
         testVars.instanceId,
         testVars.instanceVersion,
         User1Context, function cb(err, res) {
           if (err) {
             log.error(err);
             done(err);
           } else {
             log.debug(res, true);
             assert.equal(res.count, 1);
             done();
 // setTimeout(done,2000);
           }
         });
  });

  it('check if workflow instance is up [Approved]', function CB(done) {
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
      assert.isNotNull(instance.processDefinitionId);
      testVars._workflowRef = instance.id;
      assert.equal(instance.processDefinitionId, 'escalationExample:1:33');
      done();
    });
  });

  it('findById - user1 [Approved]', function CB(done) {
    models[modelName].findById(testVars.instanceId
         , User1Context, function cb(err, res) {
           if (err) {
             log.error(err);
             return done(err);
           }
           log.debug(res);
           assert.isNull(res);
           done();
         });
  });

  it('findById - user2 [Approved]', function CB(done) {
    models[modelName].findById(testVars.instanceId
         , User2Context, function cb(err, res) {
           if (err) {
             log.error(err);
             return done(err);
           }
           log.debug(res);
           assert.isNotNull(res);
           done();
         });
  });

  it('findById [REST] - user1 [Approved]', function CB(done) {
    bootstrap.login(User1Credentials, function CB(err, login) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(login.id);

      var url = bootstrap.basePath + '/' + modelName + 's/' + testVars.instanceId + '?access_token=' + bootstrap.token;

      request({ url: url, method: 'GET'}, onGet);

      function onGet(err, response) {
        if (err) {
          return done(err);
        }
        var instance = JSON.parse(response.body);
        assert.strictEqual( response.statusCode, 404);
        log.debug(instance);
        done();
      }
    });
  });

  it('findById [REST] - user2 [Approved]', function CB(done) {
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
        assert.strictEqual( response.statusCode, 200);
        log.debug(instance);
        assert.isNotNull(instance);
        assert.isNotNull(instance._status);
        assert.isNotNull(instance.luckydraw);
        assert.strictEqual(instance._status, 'private');
        assert.strictEqual(instance.luckydraw, '12345');
        done();
      }
    });
  });

  it('end update request [ through activiti ] [Approved]', function CB(done) {
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

  it('findById - user1 [Approved]', function CB(done) {
    models[modelName].findById(testVars.instanceId
         , User1Context, function cb(err, res) {
           if (err) {
             log.error(err);
             return done(err);
           }
           log.debug(res);
           assert.isNull(res);
           done();
         });
  });

  it('findById - user2 [Approved]', function CB(done) {
    models[modelName].findById(testVars.instanceId
         , User2Context, function cb(err, res) {
           if (err) {
             log.error(err);
             return done(err);
           }
           log.debug(res);
           assert.isNull(res);
           done();
         });
  });

  it('findById [REST] - user1 [Approved]', function CB(done) {
    bootstrap.login(User1Credentials, function CB(err, login) {
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
        log.debug(instance);
        assert.strictEqual( response.statusCode, 404);
        done();
      }
    });
  });

  it('findById [REST] - user2 [Approved]', function CB(done) {
    bootstrap.login(User2Credentials, function CB(err, login) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(login.id);

      var url = bootstrap.basePath + '/' + modelName + 's/' + testVars.instanceId + '?access_token=' + bootstrap.token;

      request({ url: url, method: 'GET'}, onGet);

      function onGet(err, response) {
        if (err) {
          return done(err);
        }
        var instance = JSON.parse(response.body);
        log.debug(instance);
        assert.strictEqual( response.statusCode, 404);
        done();
      }
    });
  });


  it('remove model Definition [Approved]' + modelName + ' [clean-up]', function CB(done) {
    var id = testVars.modelDetails.id;

    models.ModelDefinition.destroyById(id, User1Context, function CB(err) {
      if (err) {
        done(err);
      } else {
        done();
      }
    });
  });

  it('remove workflow mapping [clean-up] [Approved]', function CB(done) {
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

describe('Test case for Trigger on Delete Activiti [ workflow dependent ] - rejected', function CB() {
  this.timeout(10000);
  var User1Context = _.cloneDeep(User1ContextGlobal);
  var User2Context = _.cloneDeep(User2ContextGlobal);
  var testVars = {};
  var modelName = 'ActivitiTester2';
  var modelNamePlural = modelName + 's';

  it('should create testing model - ' + modelName, function CB(done) {
    var postData = {
      'name': modelName,
      'plural': modelNamePlural,
      'base': 'BaseEntity',
      'idInjection': true,
      'options': {
        'validateUpsert': true
      },
      'strict': true,
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


  it('should attach workflow to[Rejected] ' + modelName, function CB(done) {
    var attachWorkflowDef = {
      'modelName': modelName,
      'workflowBody': {
        'processDefinitionId': 'escalationExample:1:33'
      },
      'operation': 'delete',
      'wfDependent': true
    };

    models.ActivitiManager.attachWorkflow(attachWorkflowDef, bootstrap.defaultContext, function cb(err, res) {
      if (err) {
        log.error(err);
        return done(err);
      }
      // log.debug(res);
      done();
         // setTimeout(done,2000);
    });
  });

  it('create an instance of [Rejected] ' + modelName, function CB(done) {
    models[modelName].create({
      'luckydraw': '12345'
    }, User1Context, function cb(err, res) {
      if (err) {
        log.error(err);
        return done(err);
      }
      assert.isNotNull(res.id);
      testVars.instanceId = res.id.toString();
      assert.isNotNull(res._version);
      testVars.modelInstance = res;
      testVars.instanceVersion = res._version;
      log.debug(res);
      done();
    });
  });

  it('Delete the instance of [Rejected]' + modelName, function CB(done) {
    models[modelName].deleteWithVersion(
         testVars.instanceId,
         testVars.instanceVersion,
         User1Context, function cb(err, res) {
           if (err) {
             log.error(err);
             done(err);
           } else {
             log.debug(res, true);
             assert.equal(res.count, 1);
             done();
   // setTimeout(done,2000);
           }
         });
  });

  it('check if workflow instance is up [Rejected]', function CB(done) {
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
      assert.isNotNull(instance.processDefinitionId);
      testVars._workflowRef = instance.id;
      assert.equal(instance.processDefinitionId, 'escalationExample:1:33');
      done();
    });
  });

  it('findById - user1 [Rejected]', function CB(done) {
    models[modelName].findById(testVars.instanceId
         , User1Context, function cb(err, res) {
           if (err) {
             log.error(err);
             return done(err);
           }
           log.debug(res);
           assert.isNull(res);
           done();
         });
  });

  it('findById - user2 [Rejected]', function CB(done) {
    models[modelName].findById(testVars.instanceId
         , User2Context, function cb(err, res) {
           if (err) {
             log.error(err);
             return done(err);
           }
           log.debug(res);
           assert.isNotNull(res);
           done();
         });
  });

  it('findById [REST] - user1 [Rejected]', function CB(done) {
    bootstrap.login(User1Credentials, function CB(err, login) {
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
        assert.strictEqual( response.statusCode, 404);
        log.debug(instance);
        done();
      }
    });
  });

  it('findById [REST] - user2 [Rejected]', function CB(done) {
    bootstrap.login(User2Credentials, function CB(err, login) {
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
        assert.strictEqual(instance._status, 'private');
        assert.strictEqual(instance.luckydraw, '12345');
        done();
      }
    });
  });

  it('end update request [ through activiti ] [Rejected]', function CB(done) {
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

  it('findById - user1 [Rejected]', function CB(done) {
    models[modelName].findById(testVars.instanceId
         , User1Context, function cb(err, res) {
           if (err) {
             log.error(err);
             return done(err);
           }
           log.debug(res);
           assert.isNotNull(res);
           done();
         });
  });

  it('findById - user2 [Rejected]', function CB(done) {
    models[modelName].findById(testVars.instanceId
         , User2Context, function cb(err, res) {
           if (err) {
             log.error(err);
             return done(err);
           }
           log.debug(res);
           assert.isNotNull(res);
           done();
         });
  });

  it('findById [REST] - user1[Rejected]', function CB(done) {
    bootstrap.login(User1Credentials, function CB(err, login) {
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
        assert.strictEqual(instance.luckydraw, '12345');
        done();
      }
    });
  });

  it('findById [REST] - user2[Rejected]', function CB(done) {
    bootstrap.login(User2Credentials, function CB(err, login) {
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
        assert.strictEqual(instance.luckydraw, '12345');
        done();
      }
    });
  });


  it('remove model Definition  [Rejected] ' + modelName + ' [clean-up]', function CB(done) {
    var id = testVars.modelDetails.id;
    models.ModelDefinition.destroyById(id, User1Context, function CB(err) {
      if (err) {
        done(err);
      } else {
        done();
      }
    });
  });

  it('remove workflow mapping [clean-up] [Rejected]', function CB(done) {
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
