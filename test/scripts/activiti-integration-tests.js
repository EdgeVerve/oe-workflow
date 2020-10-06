/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

let bootstrap = require('../bootstrap.js');
let chai = bootstrap.chai;
let expect = chai.expect;
let models = bootstrap.app.models;
let stateVerifier = require('../utils/state-verifier');

describe('Activiti Integration Tests', function CB() {
  var demoCredentials = {
    username: 'kermit',
    password: 'kermit'
  };

  it('By Default Activiti is not enabled and related models are not defined', function testFunction(done) {
    expect(models.Activiti_Manager).to.exist;

    expect(models.Activiti_Deployment).to.not.exist;
    expect(models.Activiti_Engine).to.not.exist;
    expect(models.Activiti_Execution).to.not.exist;
    expect(models.Activiti_Form).to.not.exist;
    expect(models.Activiti_Group).to.not.exist;
    expect(models.Activiti_History).to.not.exist;
    expect(models.Activiti_Job).to.not.exist;
    expect(models.Activiti_Model).to.not.exist;
    expect(models.Activiti_ProcessDefinition).to.not.exist;
    expect(models.Activiti_ProcessInstance).to.not.exist;
    expect(models.Activiti_Runtime).to.not.exist;
    expect(models.Activiti_Table).to.not.exist;
    expect(models.Activiti_Task).to.not.exist;
    expect(models.Activiti_User).to.not.exist;
    done();
  });

  describe('When Activiti is enabled', function testFunction() {
    let workflowMapping;
    let workflowRequest;
    let workflowName = 'escalationExample:1:33';
    let storeRecord;
    before('Enable Activiti', function testFunction(done) {
      this.timeout(5000);
      let ActivitiManager = models.Activiti_Manager;
      let activitiHost = process.env.ACTIVITI_HOST || 'https://activiti.oecloud.local';
      let url = activitiHost + '/activiti-rest/service/';


      ActivitiManager.enable({baseUrl:url}, bootstrap.getContext('usr1'), function cb(err, res) {
        expect(err).to.not.exist;
        expect(res).to.exist;
        done();
      });
    });

    after('Cleanup', function testFunction(done) {
      models.Activiti_Account.destroyAll({}, bootstrap.getContext('usr1'), function cb(err, instance) {
        expect(err).to.not.exist;
        expect(instance).to.exist;
        models.Activiti_WorkflowRequest.destroyAll({}, bootstrap.getContext('usr1'), function cb(err, instance) {
          expect(err).to.not.exist;
          expect(instance).to.exist;
          models.StoreV0.destroyAll({}, bootstrap.getContext('usr1'), function cb(err, instance) {
            expect(err).to.not.exist;
            expect(instance).to.exist;
            bootstrap.cleanUp(workflowName, done);
          });
        });
      });
    });

    it('defines Activiti related models and remote methods', function testFunction(done) {
      expect(models.Activiti_Manager).to.exist;

      var modelNames = ['Activiti_Deployment',
        'Activiti_Engine',
        'Activiti_Execution',
        'Activiti_Form',
        'Activiti_Group',
        'Activiti_History',
        'Activiti_Job',
        'Activiti_Model',
        'Activiti_ProcessDefinition',
        'Activiti_ProcessInstance',
        'Activiti_Runtime',
        'Activiti_Table',
        'Activiti_Task',
        'Activiti_User'
      ];

      modelNames.forEach(modelName => {
        expect(models[modelName]).to.exist;
        let dsName = 'ds' + modelName.replace('_', '').replace(/([A-Z])/g, '-$1').toLowerCase();
        var operations = require('../../common/activiti-models/datasources/' + dsName + '.json');
        operations.forEach(op => {
          expect(models[modelName]).to.include.keys(Object.keys(op.functions));
        });
      });
      done();
    });

    it('throws error if activiti API are accessed without setting up Activiti account', function testFunction(done) {
      models.Activiti_Task.get({}, bootstrap.getContext('usr1'), function testFunction(err, response) {
        expect(err).to.exist;
        expect(err.message).to.include('Please setup Activiti Account by posting details to Activiti_Account');
        done();
      });
    });

    it('should register an activiti account - usr1', function cb(done) {
      models.Activiti_Account.create(demoCredentials, bootstrap.getContext('usr1'), function cb(err, instance) {
        expect(err).to.not.exist;
        expect(instance).to.exist;
        done();
      });
    });

    it('trying to create activiti account for same user again should fail - usr1', function cb(done) {
      models.Activiti_Account.create(demoCredentials, bootstrap.getContext('usr1'), function cb(err, instance) {
        expect(err).to.exist;
        expect(err.message).to.include('Activiti account already exists');
        expect(instance).to.not.exist;
        done();
      });
    });

    it('Activiti Accounts are filtered for current user', function cb(done) {
      models.Activiti_Account.find({}, bootstrap.defaultContext, function cb(err, instance) {
        expect(err).to.exist;
        expect(err.message).to.include('Unauthorized');
        expect(instance).to.not.exist;
        models.Activiti_Account.find({}, bootstrap.getContext('usr2'), function cb(err, instance) {
          expect(err).to.not.exist;
          expect(instance).to.exist.and.be.an('array').of.length(0);
          models.Activiti_Account.find({}, bootstrap.getContext('usr1'), function cb(err, instance) {
            expect(err).to.not.exist;
            expect(instance).to.exist.and.be.an('array').of.length(1);
            done();
          });
        });
      });
    });

    it('operation, modelName and workflowbody are required to attach workflow', function CB(done) {
      var attachWorkflowDef = {
        wfDependent: false
      };

      models.ActivitiManager.attachWorkflow(attachWorkflowDef, bootstrap.getContext('usr1'), function cb(err, res) {
        expect(err).to.exist;
        expect(err.message).to.include('operation parameter is required');
        expect(res).to.not.exist;
        attachWorkflowDef.operation = 'create';
        models.ActivitiManager.attachWorkflow(attachWorkflowDef, bootstrap.getContext('usr1'), function cb(err, res) {
          expect(err).to.exist;
          expect(err.message).to.include('modelName parameter is required');
          expect(res).to.not.exist;
          attachWorkflowDef.modelName = 'StoreV0';
          models.ActivitiManager.attachWorkflow(attachWorkflowDef, bootstrap.getContext('usr1'), function cb(err, res) {
            expect(err).to.exist;
            expect(err.message).to.include('workflowBody parameter is required');
            expect(res).to.not.exist;
            done();
          });
        });
      });
    });

    it('should attach workflow', function CB(done) {
      var attachWorkflowDef = {
        modelName: 'StoreV0',
        workflowBody: {
          processDefinitionId: workflowName
        },
        operation: 'create',
        wfDependent: false
      };

      models.ActivitiManager.attachWorkflow(attachWorkflowDef, bootstrap.getContext('usr1'), function cb(err, mapping) {
        expect(err).to.not.exist;
        expect(mapping).to.exist;
        workflowMapping = mapping;
        done();
      });
    });

    it('viewAttachedWorkflows fetches the mappings', function testFunction(done) {
      models.ActivitiManager.viewAttachedWorkflows({}, bootstrap.defaultContext, function testFunction(err, mappings) {
        expect(err).to.not.exist;
        expect(mappings).to.be.an('array').of.length(1);

        // expect(mappings[0]).to.deep.equal(workflowMapping);
        stateVerifier.checkEachProperty(mappings[0], workflowMapping, ['id', 'engineType', 'workflowBody', 'modelName', 'actualModelName', 'operation', 'version', 'wfDependent', 'makersRecall']);
        done();
      });
    });

    it('creating model instance triggers workflow', function testFunction(done) {
      models.StoreV0.create({
        owner: 'Acetone',
        sequence: 1000
      }, bootstrap.getContext('usr1'), function testFunction(err, record) {
        expect(err).to.not.exist;
        expect(record).to.exist;
        storeRecord = record;
        models.Activiti_WorkflowRequest.find({
          where: {
            modelInstanceId: record.id
          }
        }, bootstrap.defaultContext, function testFunction(err, wfReqs) {
          expect(err).to.not.exist;
          expect(wfReqs).to.exist.and.be.an('array').of.length(1);
          workflowRequest = wfReqs[0];
          expect(workflowRequest.modelName).to.equal('StoreV0');
          expect(workflowRequest.operation).to.equal('create');
          done();
        });
      });
    });

    it('creates the process-instance on activiti server', function testFunction(done) {
      expect(workflowRequest).to.exist;
      models.Activiti_ProcessInstance.getById(workflowRequest.processId, bootstrap.getContext('usr1'), function testFunction(err, data) {
        expect(err).to.not.exist;
        expect(data).to.exist;
        expect(data.id).to.equal(workflowRequest.processId);
        expect(data.ended).to.be.false;
        expect(data.suspended).to.be.false;
        expect(data.processDefinitionId).to.equal(workflowName);
        done();
      });
    });

    it('model.workflow fetches the process-instance', function testFunction(done) {
      expect(workflowRequest).to.exist;
      expect(storeRecord).to.exist;
      models.StoreV0.workflow(storeRecord.id, bootstrap.getContext('usr1'), function testFunction(err, data) {
        expect(err).to.not.exist;
        expect(data).to.exist;
        expect(data.id).to.equal(workflowRequest.processId);
        expect(data.ended).to.be.false;
        expect(data.suspended).to.be.false;
        expect(data.processDefinitionId).to.equal(workflowName);
        done();
      });
    });

    it('model.workflow without id returns error', function testFunction(done) {
      expect(workflowRequest).to.exist;
      expect(storeRecord).to.exist;
      models.StoreV0.workflow(null, bootstrap.getContext('usr1'), function testFunction(err, data) {
        expect(err).to.exist;
        expect(data).to.not.exist;
        expect(err.message).to.include('id is required to find attached Workflow Instance');
        done();
      });
    });


    it('process-instance variables on activiti server', function testFunction(done) {
      expect(workflowRequest).to.exist;
      models.Activiti_ProcessInstance.getVariables(workflowRequest.processId, bootstrap.getContext('usr1'), function testFunction(err, data) {
        expect(err).to.not.exist;
        expect(data).to.exist.and.be.an('array');
        expect(data).to.include.deep.members([{
          name: 'owner',
          type: 'string',
          value: 'Acetone',
          scope: 'local'
        }]);
        done();
      });
    });


    it('task can be queried and completed', function testFunction(done) {
      expect(workflowRequest).to.exist;
      models.Activiti_Task.get({
        processInstanceId: workflowRequest.processId
      }, bootstrap.getContext('usr1'), function testFunction(err, response) {
        expect(err).to.not.exist;
        expect(response).to.exist.and.have.property('total').that.equals(1);
        expect(response.data).to.exist.and.be.an('array').of.length(1);


        models.Activiti_Task.complete(response.data[0].id, [], bootstrap.getContext('usr1'), function testFunction(err, response) {
          expect(err).to.not.exist;
          done();
        });
      });
    });

    it('detachWorkflow returns error if id is not provided', function testFunction(done) {
      models.ActivitiManager.detachWorkflow(null, bootstrap.defaultContext, function testFunction(err, mapping) {
        expect(err).to.exist;
        expect(err.message).to.include('id is required');
        expect(mapping).to.not.exist;
        done();
      });
    });

    it('detachWorkflow removes the mappings', function testFunction(done) {
      models.ActivitiManager.detachWorkflow(workflowMapping.id, bootstrap.defaultContext, function testFunction(err, mapping) {
        expect(err).to.not.exist;
        expect(mapping).to.exist;
        models.WorkflowMapping.find({}, bootstrap.defaultContext, function testFunction(err, results) {
          expect(err).to.not.exist;
          expect(results).to.exist.and.be.an('array').of.length(0);
          done();
        });
      });
    });


    xit('Write detailed tests', function testFunction(done) {
      done(new Error('Tests not implemented yet'));
    });
  });
});
