/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

var bootstrap = require('./bootstrap');
var chai = bootstrap.chai;
var expect = chai.expect;
var models = bootstrap.models;
var fs = require('fs');
var path = require('path');
var assert = chai.assert;
var log = bootstrap.log();

var stateVerifier = require('./utils/stateverifier');

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

var BaseWorkflow = 'BaseWorkflowTemplate';
var ApprovalWorkflow = 'ApprovalWorkflow';
var RelatedWorkflow = 'RelatedWorkflowTemplate';
var BaseModel = 'PersonModel';
var RelatedModel = 'EmailModel';

describe('User Creation', function cb() {
  this.timeout(10000);
  var BaseUser = models.BaseUser;

  it('should create user - User1', function cb(done) {
    BaseUser.create(User1Details, bootstrap.defaultContext, function internalcb(err, users) {
      if (err && (err.code === 11000 || err.statusCode === 422 || err.code === 'DATA_ERROR_071' || err.code === '23505')) {
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

  it('should create user - User2', function cb(done) {
    BaseUser.create(User2Details, bootstrap.defaultContext, function internalcb(err, users) {
      if (err && (err.code === 11000 || err.statusCode === 422 || err.code === 'DATA_ERROR_071' || err.code === '23505')) {
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

describe('Initialization', function cb() {
  this.timeout(300000);
  var testVars = {};

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
          'required': true
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
        expect(Object.keys(models[modelName].definition.properties)).
          to.include.members(Object.keys(models.BaseEntity.definition.properties));
        testVars.RelatedModelDetails = res;
        done();
      }
    });
  });

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
          'model': RelatedModel,
          'foreignKey': 'personId'
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
        expect(Object.keys(models[modelName].definition.properties)).
          to.include.members(Object.keys(models.BaseEntity.definition.properties));
        testVars.BaseModelDetails = res;
        done();
      }
    });
  });

  it('should read the file for ' + ApprovalWorkflow, function cb(done) {
    fs.readFile(path.resolve('./test/bpmn-files/MakerChecker', ApprovalWorkflow + '.bpmn'), 'utf8', (err, data) => {
      testVars.xmldata = data;
      done(err);
    });
  });

  it('deploy the Approval WorkflowDefinition', function cb(done) {
    var defData = {'name': ApprovalWorkflow, 'xmldata': testVars.xmldata};
    models.WorkflowDefinition.create(defData, bootstrap.defaultContext, function internalcb(err, res) {
      // Code for duplicate keys
      if (err && (err.code === 11000 || err.code === 'DATA_ERROR_071' )) {
        done();
      } else {
        done(err);
      }
    });
  });

  it('should attach workflow to ' + BaseModel + ' and ' + RelatedModel + ' implicitly', function callback(done) {
    var CallActivityName = 'ApprovalWorkflow';
    var attachWorkflowDef = {
      'modelName': BaseModel,
      'workflowBody': {
        'workflowDefinitionName': CallActivityName,
        'processVariables': {
          'foreignKey': 'personId'
        }
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
        setTimeout(done, 2000);
      });
  });
});

describe('Test case for Trigger on Implicit Post OE Workflow [ workflow dependent ] - approved All via Base Task', function cb() {
  this.timeout(300000);
  var testVars = {};

  it('create an instance of ' + BaseModel, function callback(done) {
    models[BaseModel].create({
      'name': 'user01',
      'emails': [
        {
          'emailAddress': 'email01@oe.com'
        }, {
          'emailAddress': 'email02@oe.com'
        }
      ]
    }, User1Context, function cb(err, instance) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(instance);
      assert.isNotNull(instance._workflowRef);
      testVars._workflowRef = instance._workflowRef;
      testVars.instanceId = instance.id;
      testVars.relatedInstance01Id = instance.__data.emails[0].id;
      testVars.relatedInstance02Id = instance.__data.emails[1].id;
      setTimeout(done, 3000);
    });
  });

  it('check if workflow instance is up for Base model', function CB(done) {
    models[BaseModel].workflow(testVars.instanceId, User1Context, function CB(err, instance) {
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
      assert.equal(instance.workflowDefinitionName, BaseWorkflow);
      testVars.mainWorkflowInstance = instance;
      done();
    });
  });

  it('check if workflow instance is up for related model instance 01', function CB(done) {
    models[RelatedModel].workflow(testVars.relatedInstance01Id, User1Context, function CB(err, instance) {
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
      assert.equal(instance.workflowDefinitionName, RelatedWorkflow);
      testVars.relatedWorkflowInstance1 = instance;
      done();
    });
  });

  it('check if workflow instance is up for related model instance 02', function CB(done) {
    models[RelatedModel].workflow(testVars.relatedInstance02Id, User1Context, function CB(err, instance) {
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
      assert.equal(instance.workflowDefinitionName, RelatedWorkflow);
      testVars.relatedWorkflowInstance2 = instance;
      done();
    });
  });

  it('findById - user1 ParentModel', function CB(done) {
    models[BaseModel].findById(testVars.instanceId, User1Context, function cb(err, instance) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(instance);
      assert.isNotNull(instance);
      assert.isNotNull(instance._status);
      assert.isNotNull(instance.name);
      assert.strictEqual(instance._status, 'private');
      assert.strictEqual(instance.name, 'user01');
      done();
    });
  });

  it('findById - user1 Related Model', function CB(done) {
    models[RelatedModel].findById(testVars.relatedInstance01Id, User1Context, function cb(err, instance) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(instance);
      assert.isNotNull(instance);
      assert.isNotNull(instance._status);
      assert.isNotNull(instance.email);
      assert.strictEqual(instance._status, 'private');
      assert.strictEqual(instance.emailAddress, 'email01@oe.com');
      done();
    });
  });

  it('findById - user1 Related Model', function CB(done) {
    models[RelatedModel].findById(testVars.relatedInstance02Id, User1Context, function cb(err, instance) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(instance);
      assert.isNotNull(instance);
      assert.isNotNull(instance._status);
      assert.isNotNull(instance.email);
      assert.strictEqual(instance._status, 'private');
      assert.strictEqual(instance.emailAddress, 'email02@oe.com');
      done();
    });
  });
  it('findById - user2 Base Model Instance', function CB(done) {
    models[BaseModel].findById(testVars.instanceId, User2Context, function cb(err, instance) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(instance);
      assert.isNull(instance);
      done();
    });
  });
  it('findById - user2 Related Model Instance 01', function CB(done) {
    models[RelatedModel].findById(testVars.relatedInstance01Id, User2Context, function cb(err, instance) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(instance);
      assert.isNull(instance);
      done();
    });
  });
  it('findById - user2 related Model Instance 02', function CB(done) {
    models[RelatedModel].findById(testVars.relatedInstance02Id, User2Context, function cb(err, instance) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(instance);
      assert.isNull(instance);
      done();
    });
  });

  it('fetch main process instance', function callback(done) {
    testVars.mainWorkflowInstance.processes({
      where: {
        processDefinitionName: ApprovalWorkflow
      }
    }, User1Context, function callback(err, instance) {
      if (err) {
        return done(err);
      }
      log.debug(instance);
      assert.isNotNull(instance);
      assert.lengthOf(instance, 1);
      testVars.processes = instance[0];
      done();
    });
  });


  it('fetch parent model task instance', function callback(done) {
    testVars.processes.tasks({}, User1Context, function callback(err, task) {
      if (err) {
        return done(err);
      }
      log.debug(task);
      assert.isNotNull(task);
      assert.lengthOf(task, 1);
      testVars.task = task[0];
      assert.strictEqual(testVars.task.status, 'pending');
      done();
    });
  });

  it('complete task of parent model', function callback(done) {
    testVars.task.complete({
      'pv': {
        '_action': 'approved'
      }
    }, User1Context, function cb(err, task) {
      if (err) {
        return done(err);
      }
      assert.strictEqual(task.status, 'complete');
      setTimeout( done, 10000);
    });
  });

  it('findById - user1 Base Model Instance', function CB(done) {
    models[BaseModel].findById(testVars.instanceId, User1Context, function cb(err, instance) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(instance);
      assert.isNotNull(instance);
      assert.isNotNull(instance._status);
      assert.isNotNull(instance.name);
      assert.strictEqual(instance._status, 'public');
      assert.strictEqual(instance.name, 'user01');
      done();
    });
  });

  it('findById - user1 Related Model Instance 01', function CB(done) {
    models[RelatedModel].findById(testVars.relatedInstance01Id, User1Context, function cb(err, instance) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(instance);
      assert.isNotNull(instance);
      assert.isNotNull(instance._status);
      assert.isNotNull(instance.email);
      assert.strictEqual(instance._status, 'public');
      assert.strictEqual(instance.emailAddress, 'email01@oe.com');
      done();
    });
  });

  it('findById - user1 Related Model Instance 02', function CB(done) {
    models[RelatedModel].findById(testVars.relatedInstance02Id, User1Context, function cb(err, instance) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(instance);
      assert.isNotNull(instance);
      assert.isNotNull(instance._status);
      assert.isNotNull(instance.email);
      assert.strictEqual(instance._status, 'public');
      assert.strictEqual(instance.emailAddress, 'email02@oe.com');
      done();
    });
  });

  it('should verify Base Model Instance Workflow state', function cb(done) {
    models.WorkflowInstance.findById(testVars.mainWorkflowInstance.id, {
      'include': 'processes'
    }, User1Context, function cb(err, instance) {
      if (err) {
        return done(err);
      }
      instance = instance.toObject(true);
      assert.isNotNull(instance);
      assert.strictEqual(instance.processes.length, 2);
      var TopLevelWorkflow;
      var CallActivity;

      // because sequence is not certain in an array that Model returns
      if (instance.processes[0].processDefinitionName === BaseWorkflow) {
        TopLevelWorkflow = instance.processes[0];
        CallActivity = instance.processes[1];
      } else {
        TopLevelWorkflow = instance.processes[1];
        CallActivity = instance.processes[0];
      }

      var expectedTopLevelTokens = [
        { name: 'Init', status: 'complete' },
        { name: 'Transaction Approval Workflow', status: 'complete' },
        { name: 'Conclude Parent Transaction', status: 'complete' },
        { name: 'Prepare Related Model Signal Payload',
          status: 'complete' },
        { name: 'Signal Related Model', status: 'complete' },
        { name: 'Exit', status: 'complete' } ];

      var expectedCallActivityTokens = [
        { name: 'Start', status: 'complete' },
        { name: 'Approval Task', status: 'complete' },
        { name: 'End', status: 'complete' } ];

      stateVerifier.verifyTokens(TopLevelWorkflow._processTokens, expectedTopLevelTokens);
      stateVerifier.verifyTokens(CallActivity._processTokens, expectedCallActivityTokens);
      done();
    });
  });

  it('should verify Related Model Instance 01 Workflow state', function cb(done) {
    models.WorkflowInstance.findById(testVars.relatedWorkflowInstance1.id, {
      'include': 'processes'
    }, User1Context, function cb(err, instance) {
      if (err) {
        return done(err);
      }
      instance = instance.toObject(true);
      assert.isNotNull(instance);
      assert.strictEqual(instance.processes.length, 2);
      var TopLevelWorkflow;
      var CallActivity;

      // because sequence is not certain in an array that Model returns
      if (instance.processes[0].processDefinitionName === RelatedWorkflow) {
        TopLevelWorkflow = instance.processes[0];
        CallActivity = instance.processes[1];
      } else {
        TopLevelWorkflow = instance.processes[1];
        CallActivity = instance.processes[0];
      }

      var expectedTopLevelTokens = [
        { name: 'Init', status: 'complete' },
        { name: 'Prepare Transaction Key', status: 'complete' },
        { name: 'Approval Workflow', status: 'interrupted' },
        { name: 'Parent Model Signal Approved', status: 'complete' },
        { name: 'Parent Model Signal Rejected', status: 'interrupted' },
        { name: 'Auto Approve Transaction', status: 'complete' },
        { name: 'Approve Exit', status: 'complete' } ];

      var expectedCallActivityTokens = [
        { name: 'Start', status: 'complete' },
        { name: 'Approval Task', status: 'interrupted' } ];

      stateVerifier.verifyTokens(TopLevelWorkflow._processTokens, expectedTopLevelTokens);
      stateVerifier.verifyTokens(CallActivity._processTokens, expectedCallActivityTokens);
      done();
    });
  });

  it('should verify mainWorkflowInstance state', function cb(done) {
    models.WorkflowInstance.findById(testVars.relatedWorkflowInstance2.id, {
      'include': 'processes'
    }, User1Context, function cb(err, instance) {
      if (err) {
        return done(err);
      }
      instance = instance.toObject(true);
      assert.isNotNull(instance);
      assert.strictEqual(instance.processes.length, 2);
      var TopLevelWorkflow;
      var CallActivity;

      // because sequence is not certain in an array that Model returns
      if (instance.processes[0].processDefinitionName === RelatedWorkflow) {
        TopLevelWorkflow = instance.processes[0];
        CallActivity = instance.processes[1];
      } else {
        TopLevelWorkflow = instance.processes[1];
        CallActivity = instance.processes[0];
      }

      var expectedTopLevelTokens = [
        { name: 'Init', status: 'complete' },
        { name: 'Prepare Transaction Key', status: 'complete' },
        { name: 'Approval Workflow', status: 'interrupted' },
        { name: 'Parent Model Signal Approved', status: 'complete' },
        { name: 'Parent Model Signal Rejected', status: 'interrupted' },
        { name: 'Auto Approve Transaction', status: 'complete' },
        { name: 'Approve Exit', status: 'complete' } ];

      var expectedCallActivityTokens = [
        { name: 'Start', status: 'complete' },
        { name: 'Approval Task', status: 'interrupted' } ];

      stateVerifier.verifyTokens(TopLevelWorkflow._processTokens, expectedTopLevelTokens);
      stateVerifier.verifyTokens(CallActivity._processTokens, expectedCallActivityTokens);
      done();
    });
  });
});

describe('Test case for Trigger on Implicit Post OE Workflow [ workflow dependent ] - rejected All via Base Task', function cb() {
  this.timeout(300000);
  var testVars = {};

  it('create an instance of ' + BaseModel, function callback(done) {
    models[BaseModel].create({
      'name': 'user02',
      'emails': [
        {
          'emailAddress': 'email03@oe.com'
        }, {
          'emailAddress': 'email04@oe.com'
        }
      ]
    }, User1Context, function cb(err, instance) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(instance);
      assert.isNotNull(instance._workflowRef);
      testVars._workflowRef = instance._workflowRef;
      testVars.instanceId = instance.id;
      testVars.relatedInstance01Id = instance.__data.emails[0].id;
      testVars.relatedInstance02Id = instance.__data.emails[1].id;
      done();
    });
  });

  it('check if workflow instance is up for Base model', function CB(done) {
    models[BaseModel].workflow(testVars.instanceId, User1Context, function CB(err, instance) {
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
      assert.equal(instance.workflowDefinitionName, BaseWorkflow);
      testVars.mainWorkflowInstance = instance;
      done();
    });
  });

  it('check if workflow instance is up for related model instance 01', function CB(done) {
    models[RelatedModel].workflow(testVars.relatedInstance01Id, User1Context, function CB(err, instance) {
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
      assert.equal(instance.workflowDefinitionName, RelatedWorkflow);
      testVars.relatedWorkflowInstance1 = instance;
      done();
    });
  });

  it('check if workflow instance is up for related model instance 02', function CB(done) {
    models[RelatedModel].workflow(testVars.relatedInstance02Id, User1Context, function CB(err, instance) {
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
      assert.equal(instance.workflowDefinitionName, RelatedWorkflow);
      testVars.relatedWorkflowInstance2 = instance;
      done();
    });
  });

  it('findById - user1 ParentModel', function CB(done) {
    models[BaseModel].findById(testVars.instanceId, User1Context, function cb(err, instance) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(instance);
      assert.isNotNull(instance);
      assert.isNotNull(instance._status);
      assert.isNotNull(instance.name);
      assert.strictEqual(instance._status, 'private');
      assert.strictEqual(instance.name, 'user02');
      done();
    });
  });

  it('findById - user1 Related Model', function CB(done) {
    models[RelatedModel].findById(testVars.relatedInstance01Id, User1Context, function cb(err, instance) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(instance);
      assert.isNotNull(instance);
      assert.isNotNull(instance._status);
      assert.isNotNull(instance.email);
      assert.strictEqual(instance._status, 'private');
      assert.strictEqual(instance.emailAddress, 'email03@oe.com');
      done();
    });
  });

  it('findById - user1 Related Model', function CB(done) {
    models[RelatedModel].findById(testVars.relatedInstance02Id, User1Context, function cb(err, instance) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(instance);
      assert.isNotNull(instance);
      assert.isNotNull(instance._status);
      assert.isNotNull(instance.email);
      assert.strictEqual(instance._status, 'private');
      assert.strictEqual(instance.emailAddress, 'email04@oe.com');
      done();
    });
  });
  it('findById - user2 Base Model Instance', function CB(done) {
    models[BaseModel].findById(testVars.instanceId, User2Context, function cb(err, instance) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(instance);
      assert.isNull(instance);
      done();
    });
  });
  it('findById - user2 Related Model Instance 01', function CB(done) {
    models[RelatedModel].findById(testVars.relatedInstance01Id, User2Context, function cb(err, instance) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(instance);
      assert.isNull(instance);
      done();
    });
  });
  it('findById - user2 related Model Instance 02', function CB(done) {
    models[RelatedModel].findById(testVars.relatedInstance02Id, User2Context, function cb(err, instance) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(instance);
      assert.isNull(instance);
      done();
    });
  });

  it('fetch main process instance', function callback(done) {
    testVars.mainWorkflowInstance.processes({
      where: {
        processDefinitionName: ApprovalWorkflow
      }
    }, User1Context, function callback(err, instance) {
      if (err) {
        return done(err);
      }
      log.debug(instance);
      assert.isNotNull(instance);
      assert.lengthOf(instance, 1);
      testVars.processes = instance[0];
      done();
    });
  });


  it('fetch parent model task instance', function callback(done) {
    testVars.processes.tasks({}, User1Context, function callback(err, task) {
      if (err) {
        return done(err);
      }
      log.debug(task);
      assert.isNotNull(task);
      assert.lengthOf(task, 1);
      testVars.task = task[0];
      assert.strictEqual(testVars.task.status, 'pending');
      done();
    });
  });

  it('complete task of parent model', function callback(done) {
    testVars.task.complete({
      'pv': {
        '_action': 'rejected'
      }
    }, User1Context, function cb(err, task) {
      if (err) {
        return done(err);
      }
      assert.strictEqual(task.status, 'complete');
      setTimeout( done, 3000);
    });
  });

  it('findById - user1 Base Model Instance', function CB(done) {
    models[BaseModel].findById(testVars.instanceId, User1Context, function cb(err, instance) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(instance);
      assert.isNull(instance);
      done();
    });
  });

  it('findById - user1 Related Model Instance 01', function CB(done) {
    models[RelatedModel].findById(testVars.relatedInstance01Id, User1Context, function cb(err, instance) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(instance);
      assert.isNull(instance);
      done();
    });
  });

  it('findById - user1 Related Model Instance 02', function CB(done) {
    models[RelatedModel].findById(testVars.relatedInstance02Id, User1Context, function cb(err, instance) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(instance);
      assert.isNull(instance);
      done();
    });
  });

  it('should verify Base Model Instance Workflow state', function cb(done) {
    models.WorkflowInstance.findById(testVars.mainWorkflowInstance.id, {
      'include': 'processes'
    }, User1Context, function cb(err, instance) {
      if (err) {
        return done(err);
      }
      instance = instance.toObject(true);

      assert.isNotNull(instance);
      assert.strictEqual(instance.processes.length, 2);
      var TopLevelWorkflow;
      var CallActivity;

      // because sequence is not certain in an array that Model returns
      if (instance.processes[0].processDefinitionName === BaseWorkflow) {
        TopLevelWorkflow = instance.processes[0];
        CallActivity = instance.processes[1];
      } else {
        TopLevelWorkflow = instance.processes[1];
        CallActivity = instance.processes[0];
      }

      var expectedTopLevelTokens = [
        { name: 'Init', status: 'complete' },
        { name: 'Transaction Approval Workflow', status: 'complete' },
        { name: 'Conclude Parent Transaction', status: 'complete' },
        { name: 'Prepare Related Model Signal Payload',
          status: 'complete' },
        { name: 'Signal Related Model', status: 'complete' },
        { name: 'Exit', status: 'complete' } ];

      var expectedCallActivityTokens = [
        { name: 'Start', status: 'complete' },
        { name: 'Approval Task', status: 'complete' },
        { name: 'End', status: 'complete' } ];

      stateVerifier.verifyTokens(TopLevelWorkflow._processTokens, expectedTopLevelTokens);
      stateVerifier.verifyTokens(CallActivity._processTokens, expectedCallActivityTokens);
      done();
    });
  });

  it('should verify Related Model Instance 01 Workflow state', function cb(done) {
    models.WorkflowInstance.findById(testVars.relatedWorkflowInstance1.id, {
      'include': 'processes'
    }, User1Context, function cb(err, instance) {
      if (err) {
        return done(err);
      }
      instance = instance.toObject(true);
      assert.isNotNull(instance);
      assert.strictEqual(instance.processes.length, 2);
      var TopLevelWorkflow;
      var CallActivity;

      // because sequence is not certain in an array that Model returns
      if (instance.processes[0].processDefinitionName === RelatedWorkflow) {
        TopLevelWorkflow = instance.processes[0];
        CallActivity = instance.processes[1];
      } else {
        TopLevelWorkflow = instance.processes[1];
        CallActivity = instance.processes[0];
      }

      var expectedTopLevelTokens = [
        { name: 'Init', status: 'complete' },
        { name: 'Prepare Transaction Key', status: 'complete' },
        { name: 'Approval Workflow', status: 'interrupted' },
        { name: 'Parent Model Signal Approved', status: 'interrupted' },
        { name: 'Parent Model Signal Rejected', status: 'complete' },
        { name: 'Auto Reject Transaction', status: 'complete' },
        { name: 'Reject Exit', status: 'complete' } ];

      var expectedCallActivityTokens = [
        { name: 'Start', status: 'complete' },
        { name: 'Approval Task', status: 'interrupted' } ];

      stateVerifier.verifyTokens(TopLevelWorkflow._processTokens, expectedTopLevelTokens);
      stateVerifier.verifyTokens(CallActivity._processTokens, expectedCallActivityTokens);
      done();
    });
  });

  it('should verify mainWorkflowInstance state', function cb(done) {
    models.WorkflowInstance.findById(testVars.relatedWorkflowInstance2.id, {
      'include': 'processes'
    }, User1Context, function cb(err, instance) {
      if (err) {
        return done(err);
      }
      instance = instance.toObject(true);
      assert.isNotNull(instance);
      assert.strictEqual(instance.processes.length, 2);
      var TopLevelWorkflow;
      var CallActivity;

      // because sequence is not certain in an array that Model returns
      if (instance.processes[0].processDefinitionName === RelatedWorkflow) {
        TopLevelWorkflow = instance.processes[0];
        CallActivity = instance.processes[1];
      } else {
        TopLevelWorkflow = instance.processes[1];
        CallActivity = instance.processes[0];
      }

      var expectedTopLevelTokens = [
        { name: 'Init', status: 'complete' },
        { name: 'Prepare Transaction Key', status: 'complete' },
        { name: 'Approval Workflow', status: 'interrupted' },
        { name: 'Parent Model Signal Approved', status: 'interrupted' },
        { name: 'Parent Model Signal Rejected', status: 'complete' },
        { name: 'Auto Reject Transaction', status: 'complete' },
        { name: 'Reject Exit', status: 'complete' } ];

      var expectedCallActivityTokens = [
        { name: 'Start', status: 'complete' },
        { name: 'Approval Task', status: 'interrupted' } ];

      stateVerifier.verifyTokens(TopLevelWorkflow._processTokens, expectedTopLevelTokens);
      stateVerifier.verifyTokens(CallActivity._processTokens, expectedCallActivityTokens);
      done();
    });
  });
});

describe('Test case for Trigger on Implicit Post OE Workflow [ workflow dependent ] - approve All Tasks separately', function cb() {
  this.timeout(300000);
  var testVars = {};

  it('create an instance of ' + BaseModel, function callback(done) {
    models[BaseModel].create({
      'name': 'user01',
      'emails': [
        {
          'emailAddress': 'email05@oe.com'
        }, {
          'emailAddress': 'email06@oe.com'
        }
      ]
    }, User1Context, function cb(err, instance) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(instance);
      assert.isNotNull(instance._workflowRef);
      testVars._workflowRef = instance._workflowRef;
      testVars.instanceId = instance.id;
      testVars.relatedInstance01Id = instance.__data.emails[0].id;
      testVars.relatedInstance02Id = instance.__data.emails[1].id;
      done();
    });
  });

  it('check if workflow instance is up for Base model', function CB(done) {
    models[BaseModel].workflow(testVars.instanceId, User1Context, function CB(err, instance) {
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
      assert.equal(instance.workflowDefinitionName, BaseWorkflow);
      testVars.mainWorkflowInstance = instance;
      done();
    });
  });

  it('check if workflow instance is up for related model instance 01', function CB(done) {
    models[RelatedModel].workflow(testVars.relatedInstance01Id, User1Context, function CB(err, instance) {
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
      assert.equal(instance.workflowDefinitionName, RelatedWorkflow);
      testVars.relatedWorkflowInstance1 = instance;
      done();
    });
  });

  it('check if workflow instance is up for related model instance 02', function CB(done) {
    models[RelatedModel].workflow(testVars.relatedInstance02Id, User1Context, function CB(err, instance) {
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
      assert.equal(instance.workflowDefinitionName, RelatedWorkflow);
      testVars.relatedWorkflowInstance2 = instance;
      done();
    });
  });

  it('findById - user1 ParentModel', function CB(done) {
    models[BaseModel].findById(testVars.instanceId, User1Context, function cb(err, instance) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(instance);
      assert.isNotNull(instance);
      assert.isNotNull(instance._status);
      assert.isNotNull(instance.name);
      assert.strictEqual(instance._status, 'private');
      assert.strictEqual(instance.name, 'user01');
      done();
    });
  });

  it('findById - user1 Related Model', function CB(done) {
    models[RelatedModel].findById(testVars.relatedInstance01Id, User1Context, function cb(err, instance) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(instance);
      assert.isNotNull(instance);
      assert.isNotNull(instance._status);
      assert.isNotNull(instance.email);
      assert.strictEqual(instance._status, 'private');
      assert.strictEqual(instance.emailAddress, 'email05@oe.com');
      done();
    });
  });

  it('findById - user1 Related Model', function CB(done) {
    models[RelatedModel].findById(testVars.relatedInstance02Id, User1Context, function cb(err, instance) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(instance);
      assert.isNotNull(instance);
      assert.isNotNull(instance._status);
      assert.isNotNull(instance.email);
      assert.strictEqual(instance._status, 'private');
      assert.strictEqual(instance.emailAddress, 'email06@oe.com');
      done();
    });
  });
  it('findById - user2 Base Model Instance', function CB(done) {
    models[BaseModel].findById(testVars.instanceId, User2Context, function cb(err, instance) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(instance);
      assert.isNull(instance);
      done();
    });
  });

  it('findById - user2 Related Model Instance 01', function CB(done) {
    models[RelatedModel].findById(testVars.relatedInstance01Id, User2Context, function cb(err, instance) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(instance);
      assert.isNull(instance);
      done();
    });
  });

  it('findById - user2 related Model Instance 02', function CB(done) {
    models[RelatedModel].findById(testVars.relatedInstance02Id, User2Context, function cb(err, instance) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(instance);
      assert.isNull(instance);
      done();
    });
  });

  it('fetch main process instance', function callback(done) {
    testVars.mainWorkflowInstance.processes({
      where: {
        processDefinitionName: ApprovalWorkflow
      }
    }, User1Context, function callback(err, instance) {
      if (err) {
        return done(err);
      }
      log.debug(instance);
      assert.isNotNull(instance);
      assert.lengthOf(instance, 1);
      testVars.processes = instance[0];
      done();
    });
  });

  it('complete related model 01 task instance', function callback(done) {
    testVars.relatedWorkflowInstance1.tasks({}, User1Context, function cb(err, tasks) {
      if (err) {
        return done(err);
      }
      var task = tasks[0];
      task.complete({
        'pv': {
          '_action': 'approved'
        }
      }, User1Context, function cb(err, task) {
        if (err) {
          return done(err);
        }
        assert.strictEqual(task.status, 'complete');
        setTimeout(done, 3000);
      });
    });
  });

  it('complete related model 02 task instance', function callback(done) {
    testVars.relatedWorkflowInstance2.tasks({}, User1Context, function cb(err, tasks) {
      if (err) {
        return done(err);
      }
      var task = tasks[0];
      task.complete({
        'pv': {
          '_action': 'approved'
        }
      }, User1Context, function cb(err, task) {
        if (err) {
          return done(err);
        }
        assert.strictEqual(task.status, 'complete');
        setTimeout(done, 3000);
      });
    });
  });

  it('fetch parent model task instance', function callback(done) {
    testVars.processes.tasks({}, User1Context, function callback(err, task) {
      if (err) {
        return done(err);
      }
      log.debug(task);
      assert.isNotNull(task);
      assert.lengthOf(task, 1);
      testVars.task = task[0];
      assert.strictEqual(testVars.task.status, 'pending');
      done();
    });
  });

  it('complete task of parent model', function callback(done) {
    testVars.task.complete({
      'pv': {
        '_action': 'approved'
      }
    }, User1Context, function cb(err, task) {
      if (err) {
        return done(err);
      }
      assert.strictEqual(task.status, 'complete');
      setTimeout( done, 3000);
    });
  });

  it('findById - user1 Base Model Instance', function CB(done) {
    models[BaseModel].findById(testVars.instanceId, User1Context, function cb(err, instance) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(instance);
      assert.isNotNull(instance);
      assert.isNotNull(instance._status);
      assert.isNotNull(instance.name);
      assert.strictEqual(instance._status, 'public');
      assert.strictEqual(instance.name, 'user01');
      done();
    });
  });

  it('findById - user1 Related Model Instance 01', function CB(done) {
    models[RelatedModel].findById(testVars.relatedInstance01Id, User1Context, function cb(err, instance) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(instance);
      assert.isNotNull(instance);
      assert.isNotNull(instance._status);
      assert.isNotNull(instance.email);
      assert.strictEqual(instance._status, 'public');
      assert.strictEqual(instance.emailAddress, 'email05@oe.com');
      done();
    });
  });

  it('findById - user1 Related Model Instance 02', function CB(done) {
    models[RelatedModel].findById(testVars.relatedInstance02Id, User1Context, function cb(err, instance) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(instance);
      assert.isNotNull(instance);
      assert.isNotNull(instance._status);
      assert.isNotNull(instance.email);
      assert.strictEqual(instance._status, 'public');
      assert.strictEqual(instance.emailAddress, 'email06@oe.com');
      done();
    });
  });

  it('should verify Base Model Instance Workflow state', function cb(done) {
    models.WorkflowInstance.findById(testVars.mainWorkflowInstance.id, {
      'include': 'processes'
    }, User1Context, function cb(err, instance) {
      if (err) {
        return done(err);
      }
      instance = instance.toObject(true);
      assert.isNotNull(instance);
      assert.strictEqual(instance.processes.length, 2);
      var TopLevelWorkflow;
      var CallActivity;

      // because sequence is not certain in an array that Model returns
      if (instance.processes[0].processDefinitionName === BaseWorkflow) {
        TopLevelWorkflow = instance.processes[0];
        CallActivity = instance.processes[1];
      } else {
        TopLevelWorkflow = instance.processes[1];
        CallActivity = instance.processes[0];
      }

      var expectedTopLevelTokens = [
        { name: 'Init', status: 'complete' },
        { name: 'Transaction Approval Workflow', status: 'complete' },
        { name: 'Conclude Parent Transaction', status: 'complete' },
        { name: 'Prepare Related Model Signal Payload',
          status: 'complete' },
        { name: 'Signal Related Model', status: 'complete' },
        { name: 'Exit', status: 'complete' } ];

      var expectedCallActivityTokens = [
        { name: 'Start', status: 'complete' },
        { name: 'Approval Task', status: 'complete' },
        { name: 'End', status: 'complete' } ];

      stateVerifier.verifyTokens(TopLevelWorkflow._processTokens, expectedTopLevelTokens);
      stateVerifier.verifyTokens(CallActivity._processTokens, expectedCallActivityTokens);
      done();
    });
  });

  it('should verify Related Model Instance 01 Workflow state', function cb(done) {
    models.WorkflowInstance.findById(testVars.relatedWorkflowInstance1.id, {
      'include': 'processes'
    }, User1Context, function cb(err, instance) {
      if (err) {
        return done(err);
      }

      instance = instance.toObject(true);
      assert.isNotNull(instance);
      assert.strictEqual(instance.processes.length, 2);
      var TopLevelWorkflow;
      var CallActivity;

      // because sequence is not certain in an array that Model returns
      if (instance.processes[0].processDefinitionName === RelatedWorkflow) {
        TopLevelWorkflow = instance.processes[0];
        CallActivity = instance.processes[1];
      } else {
        TopLevelWorkflow = instance.processes[1];
        CallActivity = instance.processes[0];
      }

      var expectedTopLevelTokens = [
        { name: 'Init', status: 'complete' },
        { name: 'Prepare Transaction Key', status: 'complete' },
        { name: 'Approval Workflow', status: 'complete' },
        { name: 'Parent Model Signal Approved', status: 'interrupted' },
        { name: 'Parent Model Signal Rejected', status: 'interrupted' },
        { name: 'Conclude Related Transaction', status: 'complete' },
        { name: 'Exit', status: 'complete' } ];

      var expectedCallActivityTokens = [
        { name: 'Start', status: 'complete' },
        { name: 'Approval Task', status: 'complete' },
        { name: 'End', status: 'complete' } ];

      stateVerifier.verifyTokens(TopLevelWorkflow._processTokens, expectedTopLevelTokens);
      stateVerifier.verifyTokens(CallActivity._processTokens, expectedCallActivityTokens);
      done();
    });
  });

  it('should verify Related Model Instance 02 Workflow state', function cb(done) {
    models.WorkflowInstance.findById(testVars.relatedWorkflowInstance2.id, {
      'include': 'processes'
    }, User1Context, function cb(err, instance) {
      if (err) {
        return done(err);
      }
      instance = instance.toObject(true);
      assert.isNotNull(instance);
      assert.strictEqual(instance.processes.length, 2);
      var TopLevelWorkflow;
      var CallActivity;

      // because sequence is not certain in an array that Model returns
      if (instance.processes[0].processDefinitionName === RelatedWorkflow) {
        TopLevelWorkflow = instance.processes[0];
        CallActivity = instance.processes[1];
      } else {
        TopLevelWorkflow = instance.processes[1];
        CallActivity = instance.processes[0];
      }

      var expectedTopLevelTokens = [
        { name: 'Init', status: 'complete' },
        { name: 'Prepare Transaction Key', status: 'complete' },
        { name: 'Approval Workflow', status: 'complete' },
        { name: 'Parent Model Signal Approved', status: 'interrupted' },
        { name: 'Parent Model Signal Rejected', status: 'interrupted' },
        { name: 'Conclude Related Transaction', status: 'complete' },
        { name: 'Exit', status: 'complete' } ];

      var expectedCallActivityTokens = [
        { name: 'Start', status: 'complete' },
        { name: 'Approval Task', status: 'complete' },
        { name: 'End', status: 'complete' } ];

      stateVerifier.verifyTokens(TopLevelWorkflow._processTokens, expectedTopLevelTokens);
      stateVerifier.verifyTokens(CallActivity._processTokens, expectedCallActivityTokens);
      done();
    });
  });
});
