/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

let bootstrap = require('../bootstrap.js');
let chai = bootstrap.chai;
let expect = chai.expect;
let stateVerifier = require('../utils/state-verifier');
let Status = bootstrap.Status;
let StoreV2 = bootstrap.app.models.StoreV2;
let WorkflowManager = bootstrap.app.models.WorkflowManager;
let ChangeWorkflowRequest = bootstrap.app.models.ChangeWorkflowRequest;
let models = bootstrap.app.models;
let async = require('async');


describe('Maker Checker V2 Tests', function CB() {
  let workflowName = 'maker-checker-v2';

  before('setup', function testFunction(done) {
    this.timeout(60000);
    bootstrap.loadBpmnFile(workflowName, function testFunction(err, wfDefn) {
      expect(err).to.not.exist;
      expect(wfDefn).to.exist;
      done();
    });
  });
  after('cleanup', function testFunction(done) {
    bootstrap.cleanUp(workflowName, done);
  });

  describe('When no workflow is attached to operation', function testFunction() {
    before('create record', function testFunction(done) {
      StoreV2.create({
        owner: 'John',
        sequence: 1000
      }, bootstrap.getContext('usr1'), function testFunction(err, tkt) {
        expect(err).to.not.exist;
        expect(tkt).to.exist;
        done();
      });
    });
    after('cleanup', function testFunction(done) {
      StoreV2.destroyAll({}, done);
    });

    it('does not respond to new maker-checker API methods', function testFunction(done) {
      StoreV2 = bootstrap.loopback.getModel('StoreV2');
      expect(StoreV2).to.not.have.a.property('createX');
      expect(StoreV2).to.not.have.a.property('updateX');
      expect(StoreV2).to.not.have.a.property('deleteX');
      expect(StoreV2).to.not.have.a.property('findX');
      expect(StoreV2).to.not.have.a.property('findByIdX');
      expect(StoreV2).to.not.have.a.property('recall');
      expect(StoreV2).to.not.have.a.property('workflow');
      expect(StoreV2).to.not.have.a.property('tasks');
      done();
    });
  });

  describe('When operation has workflow attached', function testFunction() {
    let ticket;
    let workflowMapping;
    before('attach workflow', function testFunction(done) {
      WorkflowManager.attachWorkflow({
        operation: 'create',
        modelName: 'StoreV2',
        version: 'v2',
        wfDependent: true,
        workflowBody: {
          workflowDefinitionName: workflowName
        }
      }, bootstrap.defaultContext, function testFunction(err, mappings) {
        expect(err).to.not.exist;
        expect(mappings).to.exist;
        expect(mappings.mappings).to.exist.and.be.an('array').of.length(1);
        workflowMapping = mappings.mappings[0];

        StoreV2.create({
          owner: 'John',
          sequence: 1000
        }, bootstrap.getContext('usr1'), function testFunction(err, tkt) {
          expect(err).to.not.exist;
          expect(tkt).to.exist;
          ticket = tkt;
          done();
        });
      });
    });
    after('cleanup', function testFunction(done) {
      WorkflowManager.detachWorkflowWithVersion(workflowMapping.id, workflowMapping._version, bootstrap.defaultContext, function testFunction(err) {
        expect(err).to.not.exist;
        StoreV2.destroyAll({}, done);
      });
    });

    it('create: creates the record directly without any change-request', function testFunction(done) {
      expect(ticket).to.exist;
      StoreV2.findById(ticket.id, bootstrap.defaultContext, function testFunction(err, tkt) {
        expect(err).to.not.exist;
        expect(tkt).to.exist;
        // expect(tkt.toObject()).to.deep.equal(ticket.toObject());
        stateVerifier.checkEachProperty(tkt, ticket, ['id', '_version', 'owner', 'sequence', 'comments']);

        ChangeWorkflowRequest.find({}, bootstrap.defaultContext, function testFunction(err, changeRequests) {
          expect(err).to.not.exist;
          expect(changeRequests).to.be.an('array').of.length(0);
          done();
        });
      });
    });

    it('update: updates the record directly without any change-request', function testFunction(done) {
      expect(ticket).to.exist;
      ticket.updateAttributes({
        sequence: 1001,
        _version: ticket._version
      }, bootstrap.getContext('usr3'), function testFunction(err, tkt) {
        expect(err).to.not.exist;
        expect(tkt).to.exist;
        ticket = tkt;
        StoreV2.findById(ticket.id, bootstrap.defaultContext, function testFunction(err, tkt) {
          expect(err).to.not.exist;
          expect(tkt).to.exist;
          // expect(tkt.toObject()).to.deep.equal(ticket.toObject());
          stateVerifier.checkEachProperty(tkt, ticket, ['id', '_version', 'owner', 'sequence', 'comments']);

          ChangeWorkflowRequest.find({}, bootstrap.defaultContext, function testFunction(err, changeRequests) {
            expect(err).to.not.exist;
            expect(changeRequests).to.be.an('array').of.length(0);
            done();
          });
        });
      });
    });

    it('delete: deletes the record directly without any change-request', function testFunction(done) {
      expect(ticket).to.exist;
      ticket.delete(bootstrap.getContext('usr4'), function testFunction(err, response) {
        expect(err).to.not.exist;
        expect(response).to.exist;
        expect(response.count).to.equal(1);
        StoreV2.findById(ticket.id, bootstrap.defaultContext, function testFunction(err, tkt) {
          expect(err).to.not.exist;
          expect(tkt).to.not.exist;

          ChangeWorkflowRequest.find({}, bootstrap.defaultContext, function testFunction(err, changeRequests) {
            expect(err).to.not.exist;
            expect(changeRequests).to.be.an('array').of.length(0);
            done();
          });
        });
      });
    });

    it('responds to new maker-checker API methods', function testFunction(done) {
      StoreV2 = bootstrap.loopback.getModel('StoreV2');
      expect(StoreV2).to.have.a.property('createX').that.is.a('function');
      expect(StoreV2).to.have.a.property('updateX').that.is.a('function');
      expect(StoreV2).to.have.a.property('deleteX').that.is.a('function');
      expect(StoreV2).to.have.a.property('findX').that.is.a('function');
      expect(StoreV2).to.have.a.property('findByIdX').that.is.a('function');
      expect(StoreV2).to.have.a.property('recall').that.is.a('function');
      expect(StoreV2).to.have.a.property('workflow').that.is.a('function');
      expect(StoreV2).to.have.a.property('tasks').that.is.a('function');
      done();
    });

    xit('new maker-checker APIs are removed if workflow is detached', function testFunction(done) {
      WorkflowManager.detachWorkflowWithVersion(workflowMapping.id, workflowMapping._version, bootstrap.defaultContext, function testFunction(err) {
        expect(err).to.not.exist;
        StoreV2 = bootstrap.loopback.getModel('StoreV2');
        expect(StoreV2).to.not.have.a.property('createX');
        expect(StoreV2).to.not.have.a.property('updateX');
        expect(StoreV2).to.not.have.a.property('deleteX');
        expect(StoreV2).to.not.have.a.property('findX');
        expect(StoreV2).to.not.have.a.property('findByIdX');
        expect(StoreV2).to.not.have.a.property('recall');
        expect(StoreV2).to.not.have.a.property('workflow');
        expect(StoreV2).to.not.have.a.property('tasks');
        done();
      });
    });
  });

  describe('CreateX', function testFunction() {
    let storeRecord = {
      owner: 'Julia',
      sequence: 1111
    };
    let ticket;
    let workflowMapping;
    let changeRequest;
    let workflowInstance;
    let approverTask;
    before('attach workflow', function testFunction(done) {
      WorkflowManager.attachWorkflow({
        operation: 'create',
        modelName: 'StoreV2',
        version: 'v2',
        wfDependent: true,
        workflowBody: {
          workflowDefinitionName: workflowName
        }
      }, bootstrap.defaultContext, function testFunction(err, mappings) {
        expect(err).to.not.exist;
        expect(mappings).to.exist;
        expect(mappings.mappings).to.exist.and.be.an('array').of.length(1);
        workflowMapping = mappings.mappings[0];
        done();
      });
    });
    after('cleanup', function testFunction(done) {
      WorkflowManager.detachWorkflowWithVersion(workflowMapping.id, workflowMapping._version, bootstrap.defaultContext, function testFunction(err) {
        expect(err).to.not.exist;
        StoreV2.destroyAll({}, done);
      });
    });


    beforeEach(function testFunction(done) {
      async.parallel([
        function f1(cb) {
          bootstrap.onUserTask(workflowName, 'Approver', function testFunction(err, task, instance) {
            expect(err).to.not.exist;
            approverTask = task;
            cb();
          });
        },
        function f2(cb) {
          StoreV2.createX(storeRecord, bootstrap.getContext('usr1'), function testFunction(err, tkt) {
            expect(err).to.not.exist;
            expect(tkt).to.exist;
            ticket = tkt;
            ChangeWorkflowRequest.find({
              modelName: 'StoreV2',
              modelId: ticket.id
            }, bootstrap.defaultContext, function testFunction(err, changeRequests) {
              expect(err).to.not.exist;
              expect(changeRequests).to.exist.and.be.an('array').of.length(1);
              changeRequest = changeRequests[0];
              models.WorkflowInstance.findById(changeRequest.workflowInstanceId, bootstrap.defaultContext, function testFunction(err, wfInst) {
                expect(err).to.not.exist;
                workflowInstance = wfInst;
                cb();
              });
            });
          });
        }
      ], function asyncCb(err, results) {
        done(err);
      });
    });
    afterEach(function testFunction(done) {
      async.series([
        function testFunction(callback) {
          models.WorkflowInstance.destroyAll({}, callback);
        },
        function testFunction(callback) {
          models.ProcessInstance.destroyAll({}, callback);
        },
        function testFunction(callback) {
          models.ChangeWorkflowRequest.destroyAll({}, callback);
        },
        function testFunction(callback) {
          models.Task.destroyAll({}, callback);
        },
        function testFunction(callback) {
          models.StoreV2.destroyAll({}, callback);
        }
      ], function testFunction(err, results) {
        done(err);
      });
    });

    it('does not create record immediately', function testFunction(done) {
      StoreV2.find({}, bootstrap.defaultContext, function testFunction(err, records) {
        expect(err).to.not.exist;
        expect(records).to.be.an('array').that.is.empty;
        done();
      });
    });

    it('Change Request status is pending initially', function testFunction(done) {
      expect(changeRequest).to.exist;
      expect(changeRequest.status).to.equal(Status.PENDING);
      done();
    });

    it('creates a change request', function testFunction(done) {
      expect(changeRequest).to.exist;
      expect(changeRequest.status).to.equal(Status.PENDING);
      expect(changeRequest.operation).to.equal('create');
      expect(changeRequest.id).to.deep.equal(ticket._changeRequestId);
      done();
    });

    it('workflow specified by changeRequest is running', function testFunction(done) {
      expect(workflowInstance).to.exist;
      workflowInstance.processes({}, bootstrap.defaultContext, function testFunction(err, procInstances) {
        expect(err).to.not.exist;
        expect(procInstances).to.exist.and.be.an('array').of.length(1);
        let processInstance = procInstances[0];
        stateVerifier.isRunning(processInstance);
        stateVerifier.verifyTokens(processInstance, ['Start', {
          name: 'Approver',
          status: Status.PENDING
        }]);
        stateVerifier.verifyPV(processInstance, {
          _operation: 'create',
          _modelId: ticket.id,
          _maker_checker_impl: 'v2'
        });
        expect(processInstance._processVariables._modifiers).to.exist.and.be.an('array').that.has.members(['usr1']);
        expect(processInstance._processVariables._modelInstance).to.exist.and.be.an('object');
        expect(processInstance._processVariables._modelInstance.owner).to.equal(ticket.owner);
        expect(processInstance._processVariables._modelInstance.sequence).to.equal(ticket.sequence);
        expect(processInstance._processVariables._modelInstance.id).to.equal(ticket.id);
        done();
      });
    });

    it('Model.workflow fetches the running workflow', function testFunction(done) {
      StoreV2.workflow(ticket.id, bootstrap.defaultContext, function testFunction(err, wfInst) {
        expect(err).to.not.exist;
        expect(wfInst.id).to.deep.equal(workflowInstance.id);
        expect(wfInst.processes).to.exist;
        expect(wfInst.processes()).to.exist.and.be.an('array').of.length(1);
        done();
      });
    });

    it('REST: Model/workflow fetches the running workflow', function testFunction(done) {
      var url = bootstrap.basePath + '/StoreV2s/maker-checker/' + ticket.id + '/workflow';
      bootstrap.api.set('Accept', 'application/json')
        .get(url)
        .end(function testFunction(err, response) {
          expect(err).to.not.exist;
          var wfInst = response.body;
          expect(wfInst.id).to.equal(workflowInstance.id.toString());
          expect(wfInst.processes).to.exist.and.be.an('array').of.length(1);
          done();
        });
    });

    it('Model.tasks fetches the tasks', function testFunction(done) {
      StoreV2.tasks(ticket.id, {}, bootstrap.defaultContext, function testFunction(err, tasks) {
        expect(err).to.not.exist;
        expect(tasks).to.exist.and.be.an('array').of.length(1);
        expect(tasks[0].status).to.equal(Status.PENDING);
        done();
      });
    });

    it('REST: Model/tasks fetches the tasks', function testFunction(done) {
      var url = bootstrap.basePath + '/StoreV2s/maker-checker/' + ticket.id + '/tasks';
      bootstrap.api.set('Accept', 'application/json')
        .get(url)
        .end(function testFunction(err, response) {
          expect(err).to.not.exist;
          var tasks = response.body;
          expect(tasks).to.exist.and.be.an('array').of.length(1);
          expect(tasks[0].status).to.equal(Status.PENDING);
          done();
        });
    });

    it('throws error if trying to complete task without action', function testFunction(done) {
      expect(approverTask).to.exist;
      approverTask.complete({
        __action__: null
      }, bootstrap.getContext('usr2'), function testFunction(err, task) {
        expect(err).to.exist;
        expect(err.message).to.include('__action__ not provided');
        expect(task).to.not.exist;
        done();
      });
    });

    it('throws error if trying to complete task with invalid action', function testFunction(done) {
      expect(approverTask).to.exist;
      approverTask.complete({
        __action__: 'invalid-action'
      }, bootstrap.getContext('usr2'), function testFunction(err, task) {
        expect(err).to.exist;
        expect(err.message).to.include('Provided action is not valid');
        expect(task).to.not.exist;
        done();
      });
    });

    it('Task Approve creates the actual record', function testFunction(done) {
      bootstrap.onComplete(workflowName, function testFunction(err, instance) {
        expect(err).to.not.exist;
        stateVerifier.isComplete(instance);
        StoreV2.findById(ticket.id, bootstrap.defaultContext, function testFunction(err, record) {
          expect(err).to.not.exist;
          expect(record).to.exist;
          expect(record.owner).to.equal(storeRecord.owner);
          expect(record.sequence).to.equal(storeRecord.sequence);
          ticket = record;
          ChangeWorkflowRequest.findById(changeRequest.id, bootstrap.defaultContext, function testFunction(err, cr) {
            expect(err).to.not.exist;
            expect(cr).to.exist;
            changeRequest = cr;

            expect(changeRequest.status).to.equal(Status.COMPLETE);
            expect(changeRequest.verificationStatus).to.equal(Status.APPROVED);
            done();
          });
        });
      });

      expect(approverTask).to.exist;
      approverTask.complete({
        __action__: Status.APPROVED
      }, bootstrap.getContext('usr2'), function testFunction(err, task) {
        expect(err).to.not.exist;
        expect(task.status).to.equal(Status.COMPLETE);
      });
    });


    it('Task Reject does not create the actual record', function testFunction(done) {
      bootstrap.onComplete(workflowName, function testFunction(err, instance) {
        expect(err).to.not.exist;
        stateVerifier.isComplete(instance);
        StoreV2.findById(ticket.id, bootstrap.defaultContext, function testFunction(err, record) {
          expect(err).to.not.exist;
          expect(record).to.not.exist;
          ticket = record;

          ChangeWorkflowRequest.findById(changeRequest.id, bootstrap.defaultContext, function testFunction(err, cr) {
            expect(err).to.not.exist;
            expect(cr).to.exist;
            changeRequest = cr;

            expect(changeRequest.status).to.equal(Status.COMPLETE);
            expect(changeRequest.verificationStatus).to.equal(Status.REJECTED);
            done();
          });
        });
      });

      expect(approverTask).to.exist;
      approverTask.complete({
        __action__: Status.REJECTED
      }, bootstrap.getContext('usr2'), function testFunction(err, task) {
        expect(err).to.not.exist;
        expect(task.status).to.equal(Status.COMPLETE);
      });
    });

    it('Task Approver can provide additional changes', function testFunction(done) {
      bootstrap.onComplete(workflowName, function testFunction(err, instance) {
        expect(err).to.not.exist;
        stateVerifier.isComplete(instance);
        StoreV2.findById(ticket.id, bootstrap.defaultContext, function testFunction(err, record) {
          expect(err).to.not.exist;
          expect(record).to.exist;
          expect(record.owner).to.equal(storeRecord.owner);
          expect(record.sequence).to.not.equal(storeRecord.sequence);
          expect(record.sequence).to.equal(8888);
          ticket = record;
          ChangeWorkflowRequest.findById(changeRequest.id, bootstrap.defaultContext, function testFunction(err, cr) {
            expect(err).to.not.exist;
            expect(cr).to.exist;
            changeRequest = cr;

            expect(changeRequest.status).to.equal(Status.COMPLETE);
            expect(changeRequest.verificationStatus).to.equal(Status.APPROVED);
            done();
          });
        });
      });

      expect(approverTask).to.exist;
      approverTask.complete({
        sequence: 8888,
        __action__: Status.APPROVED
      }, bootstrap.getContext('usr2'), function testFunction(err, task) {
        expect(err).to.not.exist;
        expect(task.status).to.equal(Status.COMPLETE);
      });
    });

    it('Recall cancels the workflow and does not create the actual record', function testFunction(done) {
      bootstrap.onWorkflowTerminated(workflowName, function testFunction(err, wfInst) {
        expect(err).to.not.exist;
        expect(wfInst).to.exist;
        expect(wfInst.status).to.equal(Status.TERMINATED);

        ChangeWorkflowRequest.findById(changeRequest.id, bootstrap.defaultContext, function testFunction(err, cr) {
          expect(err).to.not.exist;
          expect(cr).to.not.exist;
          StoreV2.findById(ticket.id, bootstrap.defaultContext, function testFunction(err, record) {
            expect(err).to.not.exist;
            expect(record).to.not.exist;
            done();
          });
        });
      });

      StoreV2.recall(ticket.id, bootstrap.getContext('usr2'), function testFunction(err, data) {
        expect(err).to.not.exist;
        expect(data).to.exist.and.have.property('success').that.equals(true);
      });
    });

    it('returns any validation errors', function testFunction(done) {
      StoreV2.createX({
        owner: 'Julia'
      }, bootstrap.getContext('usr1'), function testFunction(err, tkt) {
        expect(err).to.exist;
        expect(err.name).to.equal('ValidationError');
        expect(err.statusCode).to.equal(422);
        expect(err.details).to.exist.and.have.a.property('codes').that.exists;
        expect(err.details.codes.sequence).to.exist;
        expect(tkt).to.not.exist;
        done();
      });
    });
  });


  describe('UpdateX', function testFunction() {
    let storeRecord = {
      owner: 'Andreas',
      sequence: 2222
    };
    let ticket;
    let workflowMapping;
    let changeRequest;
    let workflowInstance;
    let approverTask;
    before('attach workflow', function testFunction(done) {
      WorkflowManager.attachWorkflow({
        operation: 'update',
        modelName: 'StoreV2',
        version: 'v2',
        wfDependent: true,
        workflowBody: {
          workflowDefinitionName: workflowName
        }
      }, bootstrap.defaultContext, function testFunction(err, mappings) {
        expect(err).to.not.exist;
        expect(mappings).to.exist;
        expect(mappings.mappings).to.exist.and.be.an('array').of.length(1);
        workflowMapping = mappings.mappings[0];
        done();
      });
    });
    after('cleanup', function testFunction(done) {
      WorkflowManager.detachWorkflowWithVersion(workflowMapping.id, workflowMapping._version, bootstrap.defaultContext, function testFunction(err) {
        expect(err).to.not.exist;
        StoreV2.destroyAll({}, done);
      });
    });

    beforeEach(function testFunction(done) {
      bootstrap.onUserTask(workflowName, 'Approver', function testFunction(err, task, instance) {
        expect(err).to.not.exist;
        approverTask = task;
        done();
      });

      StoreV2.create(storeRecord, bootstrap.getContext('usr1'), function testFunction(err, tkt) {
        expect(err).to.not.exist;
        expect(tkt).to.exist;
        expect(tkt.sequence).to.equal(storeRecord.sequence);
        tkt.sequence = 3333;
        StoreV2.updateX(tkt.id, tkt.toObject(), bootstrap.getContext('usr2'), function testFunction(err, tkt) {
          expect(err).to.not.exist;
          expect(tkt).to.exist;
          ticket = tkt;
          ChangeWorkflowRequest.find({
            modelName: 'StoreV2',
            modelId: ticket.id
          }, bootstrap.defaultContext, function testFunction(err, changeRequests) {
            expect(err).to.not.exist;
            expect(changeRequests).to.exist.and.be.an('array').of.length(1);
            changeRequest = changeRequests[0];
            models.WorkflowInstance.findById(changeRequest.workflowInstanceId, bootstrap.defaultContext, function testFunction(err, wfInst) {
              expect(err).to.not.exist;
              workflowInstance = wfInst;
            });
          });
        });
      });
    });
    afterEach(function testFunction(done) {
      async.series([
        function testFunction(callback) {
          models.WorkflowInstance.destroyAll({}, callback);
        },
        function testFunction(callback) {
          models.ProcessInstance.destroyAll({}, callback);
        },
        function testFunction(callback) {
          models.ChangeWorkflowRequest.destroyAll({}, callback);
        },
        function testFunction(callback) {
          models.Task.destroyAll({}, callback);
        },
        function testFunction(callback) {
          models.StoreV2.destroyAll({}, callback);
        }
      ], function testFunction(err, results) {
        done(err);
      });
    });

    it('does not update record immediately', function testFunction(done) {
      StoreV2.findById(ticket.id, bootstrap.defaultContext, function testFunction(err, tkt) {
        expect(err).to.not.exist;
        expect(tkt).to.exist;
        expect(tkt.sequence).to.not.equal(3333);
        expect(tkt._modifiedBy).to.not.equal('usr2');
        done();
      });
    });

    it('creates a change request in pending status', function testFunction(done) {
      expect(changeRequest).to.exist;
      expect(changeRequest.status).to.equal(Status.PENDING);
      expect(changeRequest.operation).to.equal('update');
      expect(changeRequest.id).to.deep.equal(ticket._changeRequestId);
      done();
    });

    it('workflow specified by changeRequest is running', function testFunction(done) {
      expect(workflowInstance).to.exist;
      workflowInstance.processes({}, bootstrap.defaultContext, function testFunction(err, procInstances) {
        expect(err).to.not.exist;
        expect(procInstances).to.exist.and.be.an('array').of.length(1);
        let processInstance = procInstances[0];
        stateVerifier.isRunning(processInstance);
        stateVerifier.verifyTokens(processInstance, ['Start', {
          name: 'Approver',
          status: Status.PENDING
        }]);
        stateVerifier.verifyPV(processInstance, {
          _operation: 'update',
          _modelId: ticket.id,
          _maker_checker_impl: 'v2'
        });
        expect(processInstance._processVariables._modifiers).to.exist.and.be.an('array').that.has.members(['usr2']);
        expect(processInstance._processVariables._modelInstance).to.exist.and.be.an('object');
        expect(processInstance._processVariables._modelInstance.owner).to.equal(ticket.owner);
        expect(processInstance._processVariables._modelInstance.sequence).to.equal(ticket.sequence);
        expect(processInstance._processVariables._modelInstance.id).to.equal(ticket.id.toString());
        done();
      });
    });

    it('Model.workflow fetches the running workflow', function testFunction(done) {
      StoreV2.workflow(ticket.id, bootstrap.defaultContext, function testFunction(err, wfInst) {
        expect(err).to.not.exist;
        expect(wfInst.id).to.deep.equal(workflowInstance.id);
        expect(wfInst.processes).to.exist;
        expect(wfInst.processes()).to.exist.and.be.an('array').of.length(1);
        done();
      });
    });

    it('Model.tasks fetches the tasks', function testFunction(done) {
      StoreV2.tasks(ticket.id, {}, bootstrap.defaultContext, function testFunction(err, tasks) {
        expect(err).to.not.exist;
        expect(tasks).to.exist.and.be.an('array').of.length(1);
        expect(tasks[0].status).to.equal(Status.PENDING);
        done();
      });
    });

    it('throws error if trying to complete task without action', function testFunction(done) {
      expect(approverTask).to.exist;
      approverTask.complete({
        __action__: null
      }, bootstrap.getContext('usr2'), function testFunction(err, task) {
        expect(err).to.exist;
        expect(err.message).to.include('__action__ not provided');
        expect(task).to.not.exist;
        done();
      });
    });

    it('throws error if trying to complete task with invalid action', function testFunction(done) {
      expect(approverTask).to.exist;
      approverTask.complete({
        __action__: 'invalid-action'
      }, bootstrap.getContext('usr2'), function testFunction(err, task) {
        expect(err).to.exist;
        expect(err.message).to.include('Provided action is not valid');
        expect(task).to.not.exist;
        done();
      });
    });

    it('Task Approve updates the actual record', function testFunction(done) {
      bootstrap.onComplete(workflowName, function testFunction(err, instance) {
        expect(err).to.not.exist;
        stateVerifier.isComplete(instance);
        StoreV2.findById(ticket.id, bootstrap.defaultContext, function testFunction(err, record) {
          expect(err).to.not.exist;
          expect(record).to.exist;
          expect(record.owner).to.equal(storeRecord.owner);
          expect(record.sequence).to.equal(3333);
          ticket = record;
          ChangeWorkflowRequest.findById(changeRequest.id, bootstrap.defaultContext, function testFunction(err, cr) {
            expect(err).to.not.exist;
            expect(cr).to.exist;
            changeRequest = cr;

            expect(changeRequest.status).to.equal(Status.COMPLETE);
            expect(changeRequest.verificationStatus).to.equal(Status.APPROVED);
            done();
          });
        });
      });

      expect(approverTask).to.exist;
      approverTask.complete({
        __action__: Status.APPROVED
      }, bootstrap.getContext('usr2'), function testFunction(err, task) {
        expect(err).to.not.exist;
        expect(task.status).to.equal(Status.COMPLETE);
      });
    });


    it('Task Approver can provide additional updates', function testFunction(done) {
      bootstrap.onComplete(workflowName, function testFunction(err, instance) {
        expect(err).to.not.exist;
        stateVerifier.isComplete(instance);
        StoreV2.findById(ticket.id, bootstrap.defaultContext, function testFunction(err, record) {
          expect(err).to.not.exist;
          expect(record).to.exist;
          expect(record.owner).to.equal('Romio');
          expect(record.sequence).to.equal(5555);
          ticket = record;
          ChangeWorkflowRequest.findById(changeRequest.id, bootstrap.defaultContext, function testFunction(err, cr) {
            expect(err).to.not.exist;
            expect(cr).to.exist;
            changeRequest = cr;

            expect(changeRequest.status).to.equal(Status.COMPLETE);
            expect(changeRequest.verificationStatus).to.equal(Status.APPROVED);
            done();
          });
        });
      });

      expect(approverTask).to.exist;
      approverTask.complete({
        owner: 'Romio',
        sequence: 5555,
        __action__: Status.APPROVED
      }, bootstrap.getContext('usr2'), function testFunction(err, task) {
        expect(err).to.not.exist;
        expect(task.status).to.equal(Status.COMPLETE);
      });
    });

    it('Task Reject does not update the actual record', function testFunction(done) {
      bootstrap.onComplete(workflowName, function testFunction(err, instance) {
        expect(err).to.not.exist;
        stateVerifier.isComplete(instance);
        StoreV2.findById(ticket.id, bootstrap.defaultContext, function testFunction(err, record) {
          expect(err).to.not.exist;
          expect(record).to.exist;
          expect(record.sequence).to.equal(2222);

          ticket = record;

          ChangeWorkflowRequest.findById(changeRequest.id, bootstrap.defaultContext, function testFunction(err, cr) {
            expect(err).to.not.exist;
            expect(cr).to.exist;
            changeRequest = cr;

            expect(changeRequest.status).to.equal(Status.COMPLETE);
            expect(changeRequest.verificationStatus).to.equal(Status.REJECTED);
            done();
          });
        });
      });

      expect(approverTask).to.exist;
      approverTask.complete({
        __action__: Status.REJECTED
      }, bootstrap.getContext('usr2'), function testFunction(err, task) {
        expect(err).to.not.exist;
        expect(task.status).to.equal(Status.COMPLETE);
      });
    });

    it('Recall cancels the workflow and does not update the record', function testFunction(done) {
      bootstrap.onWorkflowTerminated(workflowName, function testFunction(err, wfInst) {
        expect(err).to.not.exist;
        expect(wfInst).to.exist;
        expect(wfInst.status).to.equal(Status.TERMINATED);

        ChangeWorkflowRequest.findById(changeRequest.id, bootstrap.defaultContext, function testFunction(err, cr) {
          expect(err).to.not.exist;
          expect(cr).to.not.exist;
          StoreV2.findById(ticket.id, bootstrap.defaultContext, function testFunction(err, record) {
            expect(err).to.not.exist;
            expect(record).to.exist;
            expect(record.sequence).to.equal(2222);
            done();
          });
        });
      });

      StoreV2.recall(ticket.id, bootstrap.getContext('usr2'), function testFunction(err, data) {
        expect(err).to.not.exist;
        expect(data).to.exist.and.have.property('success').that.equals(true);
      });
    });

    it('updating with invalid-id causes error', function testFunction(done) {
      StoreV2.updateX('invalid-id-string', {
        _version: ticket._version,
        sequence: 999
      }, bootstrap.getContext('usr1'), function testFunction(err, tkt) {
        expect(err).to.exist;
        expect(err.message).to.include('Model id is not valid');
        expect(tkt).to.not.exist;
        done();
      });
    });


    it('updating same model again without original change-request-id causes error', function testFunction(done) {
      StoreV2.updateX(ticket.id, {
        _version: ticket._version,
        sequence: 999
      }, bootstrap.getContext('usr1'), function testFunction(err, tkt) {
        expect(err).to.exist;
        expect(err.message).to.include('change request id is not provided or mismatch');
        expect(tkt).to.not.exist;
        done();
      });
    });

    it('returns any validation errors', function testFunction(done) {
      /* Potential Risk, Terminate Instance Asynchronously performs Task-Interrupt and Process-Instante-Interrupt */
      bootstrap.onWorkflowTerminated(workflowName, done);

      StoreV2.updateX(ticket.id, {
        _changeRequestId: changeRequest.id.toString(),
        _version: ticket._version,
        sequence: 'ABC'
      }, bootstrap.getContext('usr1'), function testFunction(err, tkt) {
        expect(err).to.exist;
        expect(err.name).to.equal('ValidationError');
        expect(err.statusCode).to.equal(422);
        expect(err.details).to.exist.and.have.a.property('codes').that.exists;
        expect(err.details.codes.sequence).to.exist;
        expect(tkt).to.not.exist;
      });
    });

    it('deleteX errors if update change-request is already pending', function testFunction(done) {
      StoreV2.deleteX(ticket.id, ticket._version,{}, bootstrap.defaultContext, function testFunction(err, tkt) {
        expect(err).to.exist;
        expect(err.message).to.include('Can not delete, update request pending');
        expect(tkt).to.not.exist;
        done();
      });
    });

    it('UpdateX again, causes previous change-request to be updated', function testFunction(done) {
      /* Potential Risk, Terminate Instance Asynchronously performs Task-Interrupt and Process-Instance-Interrupt */
      // bootstrap.onWorkflowTerminated(workflowName, done);
      StoreV2.updateX(ticket.id, {
        _changeRequestId: changeRequest.id.toString(),
        _version: ticket._version,
        sequence: 999
      }, bootstrap.getContext('usr1'), function testFunction(err, tkt) {
        expect(err).to.not.exist;
        models.ChangeWorkflowRequest.findById(changeRequest.id, bootstrap.defaultContext, function findCb(err, data) {
          expect(err).to.not.exist;
          expect(data.id).to.deep.equal(changeRequest.id);
          expect(data._version).to.not.equal(changeRequest._version);
          setTimeout(done, 1000);
        });
      });
    });
  });

  describe('DeleteX', function testFunction() {
    let storeRecord = {
      owner: 'Pablo',
      sequence: 3333
    };
    let ticket;
    let workflowMapping;
    let changeRequest;
    let workflowInstance;
    let approverTask;
    before('attach workflow', function testFunction(done) {
      WorkflowManager.attachWorkflow({
        operation: 'delete',
        modelName: 'StoreV2',
        version: 'v2',
        wfDependent: true,
        workflowBody: {
          workflowDefinitionName: workflowName
        }
      }, bootstrap.defaultContext, function testFunction(err, mappings) {
        expect(err).to.not.exist;
        expect(mappings).to.exist;
        expect(mappings.mappings).to.exist.and.be.an('array').of.length(1);
        workflowMapping = mappings.mappings[0];
        done();
      });
    });
    after('cleanup', function testFunction(done) {
      WorkflowManager.detachWorkflowWithVersion(workflowMapping.id, workflowMapping._version, bootstrap.defaultContext, function testFunction(err) {
        expect(err).to.not.exist;
        StoreV2.destroyAll({}, done);
      });
    });

    beforeEach(function testFunction(done) {
      bootstrap.onUserTask(workflowName, 'Approver', function testFunction(err, task, instance) {
        expect(err).to.not.exist;
        approverTask = task;
        done();
      });

      StoreV2.create(storeRecord, bootstrap.getContext('usr1'), function testFunction(err, tkt) {
        expect(err).to.not.exist;
        expect(tkt).to.exist;
        StoreV2.deleteX(tkt.id, tkt._version,{},bootstrap.getContext('usr2'), function testFunction(err, tkt) {
          expect(err).to.not.exist;
          expect(tkt).to.exist;
          ticket = tkt;
          ChangeWorkflowRequest.find({
            modelName: 'StoreV2',
            modelId: ticket.id
          }, bootstrap.defaultContext, function testFunction(err, changeRequests) {
            expect(err).to.not.exist;
            expect(changeRequests).to.exist.and.be.an('array').of.length(1);
            changeRequest = changeRequests[0];
            models.WorkflowInstance.findById(changeRequest.workflowInstanceId, bootstrap.defaultContext, function testFunction(err, wfInst) {
              expect(err).to.not.exist;
              workflowInstance = wfInst;
            });
          });
        });
      });
    });
    afterEach(function testFunction(done) {
      async.series([
        function testFunction(callback) {
          models.WorkflowInstance.destroyAll({}, callback);
        },
        function testFunction(callback) {
          models.ProcessInstance.destroyAll({}, callback);
        },
        function testFunction(callback) {
          models.ChangeWorkflowRequest.destroyAll({}, callback);
        },
        function testFunction(callback) {
          models.Task.destroyAll({}, callback);
        },
        function testFunction(callback) {
          models.StoreV2.destroyAll({}, callback);
        }
      ], function testFunction(err, results) {
        done(err);
      });
    });

    it('does not delete record immediately', function testFunction(done) {
      StoreV2.findById(ticket.id, bootstrap.defaultContext, function testFunction(err, tkt) {
        expect(err).to.not.exist;
        expect(tkt).to.exist;
        expect(tkt.sequence).to.equal(3333);
        done();
      });
    });

    it('creates a change request in pending status', function testFunction(done) {
      expect(changeRequest).to.exist;
      expect(changeRequest.status).to.equal(Status.PENDING);
      expect(changeRequest.operation).to.equal('delete');
      expect(changeRequest.id).to.deep.equal(ticket._changeRequestId);
      done();
    });

    it('workflow specified by changeRequest is running, _deletedBy is populated', function testFunction(done) {
      expect(workflowInstance).to.exist;
      workflowInstance.processes({}, bootstrap.defaultContext, function testFunction(err, procInstances) {
        expect(err).to.not.exist;
        expect(procInstances).to.exist.and.be.an('array').of.length(1);
        let processInstance = procInstances[0];
        stateVerifier.isRunning(processInstance);
        stateVerifier.verifyTokens(processInstance, ['Start', {
          name: 'Approver',
          status: Status.PENDING
        }]);
        stateVerifier.verifyPV(processInstance, {
          _operation: 'delete',
          _modelId: ticket.id,
          _maker_checker_impl: 'v2'
        });
        expect(processInstance._processVariables._modifiers).to.not.exist;
        expect(processInstance._processVariables._modelInstance).to.exist.and.be.an('object');
        expect(processInstance._processVariables._modelInstance._deletedBy).to.equal('usr2');
        expect(processInstance._processVariables._modelInstance.owner).to.equal(ticket.owner);
        expect(processInstance._processVariables._modelInstance.sequence).to.equal(ticket.sequence);
        expect(processInstance._processVariables._modelInstance.id).to.equal(ticket.id.toString());
        done();
      });
    });

    it('Model.workflow fetches the running workflow', function testFunction(done) {
      StoreV2.workflow(ticket.id, bootstrap.defaultContext, function testFunction(err, wfInst) {
        expect(err).to.not.exist;
        expect(wfInst.id).to.deep.equal(workflowInstance.id);
        expect(wfInst.processes).to.exist;
        expect(wfInst.processes()).to.exist.and.be.an('array').of.length(1);
        done();
      });
    });

    it('Model.tasks fetches the tasks', function testFunction(done) {
      StoreV2.tasks(ticket.id, {}, bootstrap.defaultContext, function testFunction(err, tasks) {
        expect(err).to.not.exist;
        expect(tasks).to.exist.and.be.an('array').of.length(1);
        expect(tasks[0].status).to.equal(Status.PENDING);
        done();
      });
    });

    it('throws error if trying to complete task without action', function testFunction(done) {
      expect(approverTask).to.exist;
      approverTask.complete({
        __action__: null
      }, bootstrap.getContext('usr2'), function testFunction(err, task) {
        expect(err).to.exist;
        expect(err.message).to.include('__action__ not provided');
        expect(task).to.not.exist;
        done();
      });
    });

    it('throws error if trying to complete task with invalid action', function testFunction(done) {
      expect(approverTask).to.exist;
      approverTask.complete({
        __action__: 'invalid-action'
      }, bootstrap.getContext('usr2'), function testFunction(err, task) {
        expect(err).to.exist;
        expect(err.message).to.include('Provided action is not valid');
        expect(task).to.not.exist;
        done();
      });
    });

    it('Task Approve deletes the actual record', function testFunction(done) {
      bootstrap.onComplete(workflowName, function testFunction(err, instance) {
        expect(err).to.not.exist;
        stateVerifier.isComplete(instance);
        StoreV2.findById(ticket.id, bootstrap.defaultContext, function testFunction(err, record) {
          expect(err).to.not.exist;
          expect(record).to.not.exist;
          ChangeWorkflowRequest.findById(changeRequest.id, bootstrap.defaultContext, function testFunction(err, cr) {
            expect(err).to.not.exist;
            expect(cr).to.exist;
            changeRequest = cr;

            expect(changeRequest.status).to.equal(Status.COMPLETE);
            expect(changeRequest.verificationStatus).to.equal(Status.APPROVED);
            done();
          });
        });
      });

      expect(approverTask).to.exist;
      approverTask.complete({
        __action__: Status.APPROVED
      }, bootstrap.getContext('usr2'), function testFunction(err, task) {
        expect(err).to.not.exist;
        expect(task.status).to.equal(Status.COMPLETE);
      });
    });


    it('Task Reject does not delete the actual record', function testFunction(done) {
      bootstrap.onComplete(workflowName, function testFunction(err, instance) {
        expect(err).to.not.exist;
        stateVerifier.isComplete(instance);
        StoreV2.findById(ticket.id, bootstrap.defaultContext, function testFunction(err, record) {
          expect(err).to.not.exist;
          expect(record).to.exist;
          expect(record.sequence).to.equal(3333);

          ticket = record;

          ChangeWorkflowRequest.findById(changeRequest.id, bootstrap.defaultContext, function testFunction(err, cr) {
            expect(err).to.not.exist;
            expect(cr).to.exist;
            changeRequest = cr;

            expect(changeRequest.status).to.equal(Status.COMPLETE);
            expect(changeRequest.verificationStatus).to.equal(Status.REJECTED);
            done();
          });
        });
      });

      expect(approverTask).to.exist;
      approverTask.complete({
        __action__: Status.REJECTED
      }, bootstrap.getContext('usr2'), function testFunction(err, task) {
        expect(err).to.not.exist;
        expect(task.status).to.equal(Status.COMPLETE);
      });
    });

    it('Recall cancels the workflow and does not update the record', function testFunction(done) {
      bootstrap.onWorkflowTerminated(workflowName, function testFunction(err, wfInst) {
        expect(err).to.not.exist;
        expect(wfInst).to.exist;
        expect(wfInst.status).to.equal(Status.TERMINATED);

        ChangeWorkflowRequest.findById(changeRequest.id, bootstrap.defaultContext, function testFunction(err, cr) {
          expect(err).to.not.exist;
          expect(cr).to.not.exist;
          StoreV2.findById(ticket.id, bootstrap.defaultContext, function testFunction(err, record) {
            expect(err).to.not.exist;
            expect(record).to.exist;
            done();
          });
        });
      });

      StoreV2.recall(ticket.id, bootstrap.getContext('usr2'), function testFunction(err, data) {
        expect(err).to.not.exist;
        expect(data).to.exist.and.have.property('success').that.equals(true);
      });
    });


    it('deleting without id causes error', function testFunction(done) {
      StoreV2.deleteX(null, 'invalid-version-string',{}, bootstrap.getContext('usr1'), function testFunction(err, tkt) {
        expect(err).to.exist;
        expect(err.message).to.include('please provide id');
        expect(tkt).to.not.exist;
        done();
      });
    });

    it('deleting without version causes error', function testFunction(done) {
      StoreV2.deleteX('invalid-id-string', null,{}, bootstrap.getContext('usr1'), function testFunction(err, tkt) {
        expect(err).to.exist;
        expect(err.message).to.include('please provide version');
        expect(tkt).to.not.exist;
        done();
      });
    });

    it('deleting with invalid-id causes error', function testFunction(done) {
      StoreV2.deleteX('invalid-id-string', 'invalid-version-string',{}, bootstrap.getContext('usr1'), function testFunction(err, tkt) {
        expect(err).to.exist;
        expect(err.message).to.include('Model id is not valid');
        expect(tkt).to.not.exist;
        done();
      });
    });

    it('deleting same model again causes error', function testFunction(done) {
      StoreV2.deleteX(ticket.id, ticket._version, {},bootstrap.getContext('usr1'), function testFunction(err, tkt) {
        expect(err).to.exist;
        expect(err.message).to.include('Delete request already pending');
        expect(tkt).to.not.exist;
        done();
      });
    });
  });

  describe('Implicit post', function testFunction() {
    let workflowMapping;
    before('attach workflow', function testFunction(done) {
      WorkflowManager.attachWorkflow({
        operation: 'create',
        modelName: 'StoreV2',
        version: 'v2',
        wfDependent: true,
        workflowBody: {
          workflowDefinitionName: workflowName
        }
      }, bootstrap.defaultContext, function testFunction(err, mappings) {
        expect(err).to.not.exist;
        expect(mappings).to.exist;
        expect(mappings.mappings).to.exist.and.be.an('array').of.length(1);
        workflowMapping = mappings.mappings[0];
        done();
      });
    });
    after('cleanup', function testFunction(done) {
      WorkflowManager.detachWorkflowWithVersion(workflowMapping.id, workflowMapping._version, bootstrap.defaultContext, function testFunction(err) {
        expect(err).to.not.exist;
        StoreV2.destroyAll({}, done);
      });
    });


    // beforeEach(function(done) {
    //   bootstrap.onUserTask(workflowName, 'Approver', function(err, task, instance) {
    //     approverTask = task;
    //     done();
    //   });

    //   StoreV2.createX(storeRecord, bootstrap.getContext('usr1'), function(err, tkt) {
    //     expect(err).to.not.exist;
    //     expect(tkt).to.exist;
    //     ticket = tkt;
    //     ChangeWorkflowRequest.find({
    //       modelName: 'StoreV2',
    //       modelId: ticket.id
    //     }, bootstrap.defaultContext, function(err, changeRequests) {
    //       expect(err).to.not.exist;
    //       expect(changeRequests).to.exist.and.be.an('array').of.length(1);
    //       changeRequest = changeRequests[0];
    //       models.WorkflowInstance.findById(changeRequest.workflowInstanceId, bootstrap.defaultContext, function(err, wfInst) {
    //         expect(err).to.not.exist;
    //         workflowInstance = wfInst;
    //       });
    //     });
    //   });
    // });

    afterEach(function testFunction(done) {
      async.series([
        function testFunction(callback) {
          models.WorkflowInstance.destroyAll({}, callback);
        },
        function testFunction(callback) {
          models.ProcessInstance.destroyAll({}, callback);
        },
        function testFunction(callback) {
          models.ChangeWorkflowRequest.destroyAll({}, callback);
        },
        function testFunction(callback) {
          models.Task.destroyAll({}, callback);
        },
        function testFunction(callback) {
          models.StoreV2.destroyAll({}, callback);
        }
      ], function testFunction(err, results) {
        done(err);
      });
    });


    it('returns error in hasOne related models', function testFunction(done) {
      let storeRecord = {
        owner: 'Julia',
        sequence: 1111,
        address: {
          line2: 'addr line 2'
        }
      };
      StoreV2.createX(storeRecord, bootstrap.getContext('usr1'), function testFunction(err, tkt) {
        expect(err).to.exist;
        expect(err.name).to.equal('ValidationError');
        expect(err.statusCode).to.equal(422);
        expect(err.details).to.exist;
        expect(err.details.codes).to.exist.and.be.an('object').that.has.property('line1').which.exists;
        expect(tkt).to.not.exist;
        done();
      });
    });

    it('accepts valid data for hasOne related models', function testFunction(done) {
      let storeRecord = {
        owner: 'Julia',
        sequence: 1111,
        address: {
          line1: 'addr line 1',
          line2: 'addr line 2'
        }
      };
      bootstrap.onUserTask(workflowName, 'Approver', function testFunction(err, approverTask, instance) {
        expect(err).to.not.exist;
        expect(approverTask).to.exist;
        approverTask.complete({
          __action__: Status.APPROVED
        }, bootstrap.getContext('usr2'), function testFunction(err, task) {
          expect(err).to.not.exist;
          expect(task.status).to.equal(Status.COMPLETE);
        });
      });
      bootstrap.onComplete(workflowName, function testFunction(err, instance) {
        expect(err).to.not.exist;
        stateVerifier.isComplete(instance);
        // TODO - Verify if all data have been created
        done();
      });


      StoreV2.createX(storeRecord, bootstrap.getContext('usr1'), function testFunction(err, tkt) {
        expect(err).to.not.exist;
        expect(tkt).to.exist;
        expect(tkt.address).to.exist;
        expect(tkt.address.line1).to.equal(storeRecord.address.line1);
        expect(tkt.address.line2).to.equal(storeRecord.address.line2);
        /* Before Save Hooks are applied for related models */
        expect(tkt.address._createdBy).to.equal('usr1');
        expect(tkt.address._version).to.exist;
      });
    });

    it('returns error in hasMany related models', function testFunction(done) {
      let storeRecord = {
        owner: 'Julia',
        sequence: 1111,
        orders: [{
          buyer: 'Alex'
        }]
      };
      StoreV2.createX(storeRecord, bootstrap.getContext('usr1'), function testFunction(err, tkt) {
        expect(err).to.exist;
        expect(err.name).to.equal('ValidationError');
        expect(err.statusCode).to.equal(422);
        expect(err.details).to.exist;
        expect(err.details.codes).to.exist.and.be.an('object').that.has.property('quantity').which.exists;
        expect(tkt).to.not.exist;
        done();
      });
    });

    it('accepts valid data for hasMany related models', function testFunction(done) {
      let storeRecord = {
        owner: 'Julia',
        sequence: 1111,
        orders: [{
          buyer: 'Alex',
          quantity: 20
        }]
      };
      StoreV2.createX(storeRecord, bootstrap.getContext('usr1'), function testFunction(err, tkt) {
        expect(err).to.not.exist;
        expect(tkt).to.exist;
        expect(tkt.orders).to.exist.and.be.an('array').of.length(1);
        expect(tkt.orders[0].buyer).to.equal(storeRecord.orders[0].buyer);
        expect(tkt.orders[0].quantity).to.equal(storeRecord.orders[0].quantity);
        /* Before Save Hooks are applied for related models */
        expect(tkt.orders[0]._createdBy).to.equal('usr1');
        expect(tkt.orders[0]._version).to.exist;
        done();
      });
    });
  });

  describe('Maker-Checker findX/findByIdX/Misc', function testFunction() {
    let storeRecord1 = {
      owner: 'Genelia',
      sequence: 4000
    };
    let storeRecord2 = {
      owner: 'James',
      sequence: 5000
    };

    let ticket1;
    let ticket2;
    let workflowMapping;
    before('attach workflow', function testFunction(done) {
      bootstrap.onUserTask(workflowName, 'Approver', function testFunction(err, task, instance) {
        expect(err).to.not.exist;
        done();
      });

      WorkflowManager.attachWorkflow({
        operation: 'create',
        modelName: 'StoreV2',
        version: 'v2',
        wfDependent: true,
        makersRecall: true,
        workflowBody: {
          workflowDefinitionName: workflowName
        }
      }, bootstrap.defaultContext, function testFunction(err, mappings) {
        expect(err).to.not.exist;
        expect(mappings).to.exist;
        expect(mappings.mappings).to.exist.and.be.an('array').of.length(1);
        workflowMapping = mappings.mappings[0];

        StoreV2.create(storeRecord1, bootstrap.getContext('usr1'), function testFunction(err, tkt) {
          expect(err).to.not.exist;
          expect(tkt).to.exist;
          ticket1 = tkt;
          StoreV2.createX(storeRecord2, bootstrap.getContext('usr2'), function testFunction(err, tkt) {
            expect(err).to.not.exist;
            expect(tkt).to.exist;
            ticket2 = tkt;
          });
        });
      });
    });
    after('cleanup', function testFunction(done) {
      WorkflowManager.detachWorkflowWithVersion(workflowMapping.id, workflowMapping._version, bootstrap.defaultContext, function testFunction(err) {
        expect(err).to.not.exist;
        StoreV2.destroyAll({}, function testFunction() {
          bootstrap.cleanUp(workflowName, done);
        });
      });
    });

    it('findX returns all pending change-requests', function testFunction(done) {
      StoreV2.findX(bootstrap.defaultContext, function testFunction(err, data) {
        expect(err).to.not.exist;
        expect(data).to.exist.and.be.an('array').of.length(1);
        stateVerifier.checkEachProperty(data[0], ticket2, ['id', '_version', '_type', '_changeRequestId', 'owner', 'sequence', 'comments']);
        // expect(data[0]).to.deep.equal(ticket2);
        done();
      });
    });

    it('REST: Model/findX returns all pending change-requests', function testFunction(done) {
      var url = bootstrap.basePath + '/StoreV2s/maker-checker';
      bootstrap.api.set('Accept', 'application/json')
        .get(url)
        .end(function testFunction(err, response) {
          expect(err).to.not.exist;
          var data = response.body;
          expect(data).to.exist.and.be.an('array').of.length(1);
          expect(data[0]._changeRequestId).to.equal(ticket2._changeRequestId.toString());
          stateVerifier.checkEachProperty(data[0], ticket2, ['id', '_version', '_type', 'owner', 'sequence', 'comments']);
          done();
        });
    });

    it('findByIdX returns the record from change-request table', function testFunction(done) {
      StoreV2.findByIdX(ticket2.id, bootstrap.defaultContext, function testFunction(err, data) {
        expect(err).to.not.exist;
        expect(data).to.exist.and.be.an('object');
        stateVerifier.checkEachProperty(data, ticket2, ['id', '_version', '_type', '_changeRequestId', 'owner', 'sequence', 'comments']);
        // expect(data).to.deep.equal(ticket2);
        done();
      });
    });

    it('findByIdX returns from main table', function testFunction(done) {
      StoreV2.findByIdX(ticket1.id, bootstrap.defaultContext, function testFunction(err, data) {
        expect(err).to.not.exist;
        expect(data).to.exist.and.be.an('object');
        stateVerifier.checkEachProperty(data, ticket1, ['id', '_version', '_type', '_changeRequestId', 'owner', 'sequence', 'comments']);
        // expect(data.toObject()).to.deep.equal(ticket1.toObject());
        done();
      });
    });

    it('findByIdX returns error if model not found', function testFunction(done) {
      StoreV2.findByIdX('invalid-id', bootstrap.defaultContext, function testFunction(err, data) {
        expect(err).to.exist;
        expect(err.message).to.include('Record with id:invalid-id not found');
        expect(data).to.not.exist;
        done();
      });
    });

    it('workflow() returns error if id is not provided', function testFunction(done) {
      StoreV2.workflow(null, bootstrap.defaultContext, function testFunction(err, wfInst) {
        expect(err).to.exist;
        expect(err.message).to.include('id is required');
        expect(wfInst).to.not.exist;
        done();
      });
    });

    it('workflow() returns empty array if no workflow running for given model', function testFunction(done) {
      StoreV2.workflow(ticket1.id, bootstrap.defaultContext, function testFunction(err, wfInst) {
        expect(err).to.not.exist;
        expect(wfInst).to.exist.and.be.an('array').of.length(0);
        done();
      });
    });

    it('tasks() returns empty array if no workflow running for given model', function testFunction(done) {
      StoreV2.tasks(ticket1.id, {}, bootstrap.defaultContext, function testFunction(err, tasks) {
        expect(err).to.not.exist;
        expect(tasks).to.exist.and.be.an('array').of.length(0);
        done();
      });
    });

    it('tasks() supports 3 argument call', function testFunction(done) {
      StoreV2.tasks(ticket2.id, {}, function testFunction(err, tasks) {
        expect(err).to.not.exist;
        expect(tasks).to.exist.and.be.an('array').of.length(1);
        done();
      });
    });

    it('updateX errors as there is no update mapping specified', function testFunction(done) {
      StoreV2.updateX(ticket1.id, ticket1, bootstrap.getContext('usr1'), function testFunction(err, tkt) {
        expect(err).to.exist;
        expect(err.message).to.include('no update maker checker mapping found');
        expect(tkt).to.not.exist;
        done();
      });
    });

    it('deleteX errors as there is no delete mapping specified', function testFunction(done) {
      StoreV2.deleteX(ticket1.id, ticket1._version, {},bootstrap.getContext('usr1'), function testFunction(err, tkt) {
        expect(err).to.exist;
        expect(err.message).to.include('no delete maker checker mapping found');
        expect(tkt).to.not.exist;
        done();
      });
    });

    it('Recall for invalid modelId returns error', function testFunction(done) {
      StoreV2.recall(ticket1.id, bootstrap.getContext('usr2'), function testFunction(err, data) {
        expect(err).to.exist;
        expect(err.statusCode).to.equal(404);
        expect(err.code).to.equal('MODEL_NOT_FOUND');
        expect(err.message).to.include('No change request to recall');
        expect(data).to.not.exist;
        done();
      });
    });

    it('makersRecall:true, Recall fails with error if options do not contain username', function testFunction(done) {
      StoreV2.recall(ticket2.id, {}, function testFunction(err, data) {
        expect(err).to.exist;
        expect(err.message).to.include('Not authorized to recall');
        expect(data).to.not.exist;
        done();
      });
    });

    it('makersRecall:true, Recall fails with error if user is not a modifier', function testFunction(done) {
      StoreV2.recall(ticket2.id, bootstrap.getContext('usr3'), function testFunction(err, data) {
        expect(err).to.exist;
        expect(err.message).to.include('Not authorized to recall');
        expect(data).to.not.exist;
        done();
      });
    });


    // it('Recall for invalid modelId returns error', function(done) {
    //   bootstrap.onWorkflowTerminated(workflowName, function(err, wfInst) {
    //     expect(wfInst).to.exist;
    //     expect(wfInst.status).to.equal(Status.TERMINATED);

    //     ChangeWorkflowRequest.findById(changeRequest.id, bootstrap.defaultContext, function(err, cr) {
    //       expect(err).to.not.exist;
    //       expect(cr).to.not.exist;
    //       StoreV2.findById(ticket.id, bootstrap.defaultContext, function(err, record) {
    //         expect(err).to.not.exist;
    //         expect(record).to.exist;
    //         done();
    //       });
    //     });
    //   });

    //   StoreV2.recall(ticket.id, bootstrap.getContext('usr2'), function(err, data) {
    //     expect(err).to.not.exist;
    //     expect(data).to.exist.and.have.property('success').that.equals(true);
    //   });
    // });
  });
});
