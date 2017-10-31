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
var User1Details = {
  'username': 'user1',
  'email': 'user1@oe.com',
  'password': 'user1',
  'id': 'user1'
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
});

describe('Test case for Implicitly attaching workflow to related models - ImplicitPost and sameworkflow attachment', function callback() {
  this.timeout(35000);
  var BaseModel = 'PersonModel01';
  var RelatedModel = 'EmailModel01';
  var wfName = 'basicapproval';
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
        }
      },
      'relations': {
        'emails': {
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
        'emailAddress': {
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

  var name = 'callActivity';
  var callActivityName = 'subProcess';
  it('should read the file', function CB(done) {
    fs.readFile(path.resolve('./test/bpmn-files', name + '.bpmn'), 'utf8', (err, data) => {
      testVars.xmldata = data;
      done(err);
    });
  });

  it('should read the call Activity file', function CB(done) {
    fs.readFile(path.resolve('./test/bpmn-files', callActivityName + '.bpmn'), 'utf8', (err, data) => {
      testVars.callActivityData = data;
      done(err);
    });
  });

  it('deploy the callActivity WorkflowDefinition', function CB(done) {
    var defData = { 'name': 'childProcess', 'xmldata': testVars.callActivityData };
    models.WorkflowDefinition.create(defData, bootstrap.defaultContext, function CB(err) {
      // Code for duplicate keys
      if (bootstrap.checkDuplicateKeyError(err)) {
        done();
      } else {
        done(err);
      }
    });
  });

  it('deploy the main WorkflowDefinition', function CB(done) {
    var defData = { 'name': name, 'xmldata': testVars.xmldata };
    models.WorkflowDefinition.create(defData, bootstrap.defaultContext, function CB(err) {
      // Code for duplicate keys
      if (bootstrap.checkDuplicateKeyError(err))              {done();}          else {
        done(err);
      }
    });
  });

  it('should attach workflow to ' + BaseModel, function callback(done) {
    var attachWorkflowDef = {
      'modelName': BaseModel,
      'workflowBody': {
        'workflowDefinitionName': wfName
      },
      'operation': 'create',
      'wfDependent': true,
      'attachToRelatedModels': {
        'attachSameWorkflow': true,
        'implicitPost': true
      }
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


  it('Check workflow mapping for Related Model', function callback(done) {
    var filter = {
      where: {
        actualModelName: RelatedModel
      }
    };
    models.WorkflowMapping.find(filter, User1Context, function cb(err, res) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(res);
      assert.equal(res.length, 1);
      assert.equal(res[0].modelName, RelatedModel);
      assert.equal(res[0].workflowBody.workflowDefinitionName, 'RelatedWorkflowTemplate');
      done();
    });
  });


  it('Check workflow mapping for Base Model', function callback(done) {
    var filter = {
      where: {
        actualModelName: BaseModel
      }
    };
    models.WorkflowMapping.find(filter, User1Context, function cb(err, res) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(res);
      assert.equal(res.length, 1);
      assert.equal(res[0].modelName, BaseModel);
      assert.equal(res[0].workflowBody.workflowDefinitionName, 'BaseWorkflowTemplate');
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

describe('Test case for Implicitly attaching workflow to related models - Not an Implicit Post but attach same workflow', function callback() {
  this.timeout(35000);
  var BaseModel = 'PersonModel02';
  var RelatedModel = 'EmailModel02';
  var wfName = 'basicapproval';
  var testVars = {};
  var wfNameRelated =  'ExclusiveGateway3';

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
        }
      },
      'relations': {
        'emails': {
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
        'emailAddress': {
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
  it('should read the file', function callback(done) {
    fs.readFile(path.resolve('./test/bpmn-files', wfNameRelated + '.bpmn'), 'utf8', (err, data) => {
      testVars.xmldata = data;
      done(err);
    });
  });

  it('deploy the WorkflowDefinition', function callback(done) {
    var defData = {'name': wfNameRelated, 'xmldata': testVars.xmldata};
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
      'modelName': BaseModel,
      'workflowBody': {
        'workflowDefinitionName': wfName
      },
      'operation': 'create',
      'wfDependent': true,
      'attachToRelatedModels': {
        'attachSameWorkflow': true,
        'implicitPost': false
      }
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


  it('Check workflow mapping for Related Model', function callback(done) {
    var filter = {
      where: {
        actualModelName: RelatedModel
      }
    };
    models.WorkflowMapping.find(filter, User1Context, function cb(err, res) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(res);
      assert.equal(res.length, 1);
      assert.equal(res[0].modelName, RelatedModel);
      assert.equal(res[0].workflowBody.workflowDefinitionName, wfName);
      done();
    });
  });


  it('Check workflow mapping for Base Model', function callback(done) {
    var filter = {
      where: {
        actualModelName: BaseModel
      }
    };
    models.WorkflowMapping.find(filter, User1Context, function cb(err, res) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(res);
      assert.equal(res.length, 1);
      assert.equal(res[0].modelName,  BaseModel);
      assert.equal(res[0].workflowBody.workflowDefinitionName, wfName);
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

describe('Test case for Implicitly attaching workflow to related models - Implicit Post but not same workflow attachment', function callback() {
  this.timeout(15000);
  var BaseModel = 'PersonModel03';
  var RelatedModel = 'EmailModel03';
  var wfName = 'basicapproval';
  var wfNameBase = 'ExclusiveGateway3';
  var testVars = {};
  var wfNameRelated =  'ExclusiveGateway3';


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
        }
      },
      'relations': {
        'emails': {
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
        'emailAddress': {
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

  it('should read the file', function callback(done) {
    fs.readFile(path.resolve('./test/bpmn-files', wfNameBase + '.bpmn'), 'utf8', (err, data) => {
      testVars.xmldata = data;
      done(err);
    });
  });

  it('deploy the WorkflowDefinition', function callback(done) {
    var defData = {'name': wfNameBase, 'xmldata': testVars.xmldata};
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
      'modelName': BaseModel,
      'workflowBody': {
        'workflowDefinitionName': wfName
      },
      'operation': 'create',
      'wfDependent': true,
      'attachToRelatedModels': {
        'attachSameWorkflow': false,
        'implicitPost': true,
        'relatedModelWorkflowBody': {
          'emails': {
            // Each item in relatedModelWorkflowBody will have relation name as key and contains wokflowdefinition & Process Variables
            'workflowBody': {
              'workflowDefinitionName': wfNameRelated,
              'processVariables': {}
            }
          }
        }
      }
    };

    models.WorkflowManager.attachWorkflow(attachWorkflowDef
      , bootstrap.defaultContext, function cb(err, res) {
        if (err) {
          log.error(err);
          assert.isNotNull(err);
          return setTimeout(done, 2000);
        }
        log.debug(res);
        return done();
      });
  });

  it('Check workflow mapping for Base Model', function callback(done) {
    var filter = {
      where: {
        actualModelName: BaseModel
      }
    };
    models.WorkflowMapping.find(filter, User1Context, function cb(err, res) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(res);
      assert.equal(res.length, 1);
      assert.equal(res[0].modelName, BaseModel);
      assert.equal(res[0].workflowBody.workflowDefinitionName, 'BaseWorkflowTemplate');
      done();
    });
  });

  it('Check workflow mapping for Base Model', function callback(done) {
    var filter = {
      where: {
        actualModelName: RelatedModel
      }
    };
    models.WorkflowMapping.find(filter, User1Context, function cb(err, res) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(res);
      assert.equal(res.length, 1);
      assert.equal(res[0].modelName, RelatedModel);
      assert.equal(res[0].workflowBody.workflowDefinitionName, 'RelatedWorkflowTemplate');
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

describe('Test case for Implicitly attaching workflow to related models - Neither an Implicit post nor sameworkflow attachment', function callback() {
  this.timeout(15000);
  var BaseModel = 'PersonModel04';
  var RelatedModel = 'EmailModel04';
  var wfName = 'basicapproval';
  var wfNameBase = 'ExclusiveGateway3';
  var testVars = {};
  var wfNameRelated =  'ExclusiveGateway3';


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
        }
      },
      'relations': {
        'emails': {
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
        'emailAddress': {
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

  it('should read the file', function callback(done) {
    fs.readFile(path.resolve('./test/bpmn-files', wfNameBase + '.bpmn'), 'utf8', (err, data) => {
      testVars.xmldata = data;
      done(err);
    });
  });

  it('deploy the WorkflowDefinition', function callback(done) {
    var defData = {'name': wfNameBase, 'xmldata': testVars.xmldata};
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
      'modelName': BaseModel,
      'workflowBody': {
        'workflowDefinitionName': wfName
      },
      'operation': 'create',
      'wfDependent': true,
      'attachToRelatedModels': {
        'attachSameWorkflow': false,
        'implicitPost': false,
        'relatedModelWorkflowBody': {
          'emails': {
            // Each item in relatedModelWorkflowBody will have relation name as key and contains wokflowdefinition & Process Variables
            'workflowBody': {
              'workflowDefinitionName': wfNameRelated,
              'processVariables': {}
            }
          }
        }
      }
    };

    models.WorkflowManager.attachWorkflow(attachWorkflowDef
      , bootstrap.defaultContext, function cb(err, res) {
        if (err) {
          log.error(err);
          assert.isNotNull(err);
          return setTimeout(done, 2000);
        }
        log.debug(res);
        return done();
      });
  });

  it('Check workflow mapping for Base Model', function callback(done) {
    var filter = {
      where: {
        actualModelName: BaseModel
      }
    };
    models.WorkflowMapping.find(filter, User1Context, function cb(err, res) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(res);
      assert.equal(res.length, 1);
      assert.equal(res[0].modelName, BaseModel);
      assert.equal(res[0].workflowBody.workflowDefinitionName, wfName);
      done();
    });
  });

  it('Check workflow mapping for Base Model', function callback(done) {
    var filter = {
      where: {
        actualModelName: RelatedModel
      }
    };
    models.WorkflowMapping.find(filter, User1Context, function cb(err, res) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(res);
      assert.equal(res.length, 1);
      assert.equal(res[0].modelName, RelatedModel);
      assert.equal(res[0].workflowBody.workflowDefinitionName, wfNameRelated);
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

describe('Test case for Implicitly attaching workflow to related models - Related Model already attached[Error scenario]', function callback() {
  this.timeout(35000);
  var BaseModel = 'PersonModel05';
  var RelatedModel = 'EmailModel05';
  var wfName = 'basicapproval';
  var testVars = {};
  var wfNameRelated =  'ExclusiveGateway3';

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
        }
      },
      'relations': {
        'emails': {
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
        'emailAddress': {
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
  it('should read the file', function callback(done) {
    fs.readFile(path.resolve('./test/bpmn-files', wfNameRelated + '.bpmn'), 'utf8', (err, data) => {
      testVars.xmldata = data;
      done(err);
    });
  });

  it('deploy the WorkflowDefinition', function callback(done) {
    var defData = {'name': wfNameRelated, 'xmldata': testVars.xmldata};
    models.WorkflowDefinition.create(defData, bootstrap.defaultContext, function callback(err, res) {
      // Code for duplicate keys
      if (bootstrap.checkDuplicateKeyError(err)) {
        done();
      } else {
        done(err);
      }
    });
  });


  it('should attach workflow to ' + RelatedModel, function callback(done) {
    var attachWorkflowDef = {
      'modelName': RelatedModel,
      'workflowBody': {
        'workflowDefinitionName': wfNameRelated
      },
      'operation': 'create',
      'wfDependent': true
    };

    models.WorkflowManager.attachWorkflow(attachWorkflowDef
      , bootstrap.defaultContext, function cb(err, res) {
        if (err) {
          log.error(err);
          return done(err);
        }
        log.debug(res);
        setTimeout(done, 2000);
      });
  });

  it('should attach workflow to ' + BaseModel, function callback(done) {
    var attachWorkflowDef = {
      'modelName': BaseModel,
      'workflowBody': {
        'workflowDefinitionName': wfName
      },
      'operation': 'create',
      'wfDependent': true,
      'attachToRelatedModels': {
        'attachSameWorkflow': true,
        'implicitPost': false
      }
    };

    models.WorkflowManager.attachWorkflow(attachWorkflowDef
      , bootstrap.defaultContext, function cb(err, res) {
        if (err) {
          log.error(err);
          return done();
        }
        log.debug(res);
        return done();
      });
  });


  it('Check workflow mapping for Related Model', function callback(done) {
    var filter = {
      where: {
        actualModelName: RelatedModel
      }
    };
    models.WorkflowMapping.find(filter, User1Context, function cb(err, res) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(res);
      assert.equal(res.length, 1);
      assert.equal(res[0].modelName, RelatedModel);
      assert.equal(res[0].workflowBody.workflowDefinitionName, wfNameRelated);
      done();
    });
  });


  it('Check workflow mapping for Base Model', function callback(done) {
    var filter = {
      where: {
        actualModelName: BaseModel
      }
    };
    models.WorkflowMapping.find(filter, User1Context, function cb(err, res) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(res);
      assert.equal(res.length, 0);
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


