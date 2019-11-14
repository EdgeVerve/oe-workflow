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
let models = bootstrap.app.models;
let async = require('async');

describe('Maker Checker V1 Tests', function CB() {
  let workflowName = 'maker-checker-v1';

  function intermediateCleanup(done) {
    async.series([
      function testFunction(callback) {
        models.WorkflowInstance.destroyAll({}, callback);
      },
      function testFunction(callback) {
        models.ProcessInstance.destroyAll({}, callback);
      },
      function testFunction(callback) {
        models.WorkflowRequest.destroyAll({}, callback);
      },
      function testFunction(callback) {
        models.Task.destroyAll({}, callback);
      },
      function testFunction(callback) {
        models.StoreV1.destroyAll({}, {
          _skip_wf: true
        }, callback);
      }
    ], function testFunction(err, results) {
      done(err);
    });
  }

  before('setup', function testFunction(done) {
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
    let storeRecord;
    before('create record', function testFunction(done) {
      models.StoreV1.create({
        owner: 'John',
        sequence: 1000
      }, bootstrap.getContext('usr1'), function testFunction(err, tkt) {
        expect(err).to.not.exist;
        expect(tkt).to.exist;
        storeRecord = tkt;
        done();
      });
    });
    after('cleanup', function testFunction(done) {
      models.StoreV1.destroyAll({}, done);
    });

    it('creates record without status as public/private', function testFunction(done) {
      expect(storeRecord).to.exist;
      expect(storeRecord).to.not.have.property('_status');
      done();
    });
    it('record is visible to other users', function testFunction(done) {
      expect(storeRecord).to.exist;
      models.StoreV1.findById(storeRecord.id, bootstrap.getContext('usr2'), function testFunction(err, tkt) {
        expect(err).to.not.exist;
        expect(tkt).to.exist;
        expect(tkt.id).to.deep.equal(storeRecord.id);
        expect(tkt.owner).to.equal(storeRecord.owner);
        expect(tkt.sequence).to.equal(storeRecord.sequence);
        expect(tkt).to.not.have.property('_status');
        done();
      });
    });
    it('record can be updated by any user', function testFunction(done) {
      expect(storeRecord).to.exist;
      storeRecord.updateAttributes({
        sequence: 1001,
        _version: storeRecord._version
      }, bootstrap.getContext('usr3'), function testFunction(err, tkt) {
        expect(err).to.not.exist;
        expect(tkt).to.exist;
        expect(tkt.id).to.deep.equal(storeRecord.id);
        expect(tkt.owner).to.equal(storeRecord.owner);
        expect(tkt.sequence).to.equal(storeRecord.sequence);
        expect(tkt).to.not.have.property('_status');
        done();
      });
    });

    it('record can be deleted by any user', function testFunction(done) {
      expect(storeRecord).to.exist;
      storeRecord.delete(bootstrap.getContext('usr4'), function testFunction(err, response) {
        expect(err).to.not.exist;
        expect(response).to.exist;
        expect(response.count).to.equal(1);
        done();
      });
    });
  });

  describe('When operation has workflow attached on CREATE operation', function testFunction() {
    let storeData = {
      owner: 'Julia',
      sequence: 1111
    };
    let storeRecord;
    let workflowInstance;
    let workflowMapping;
    let changeRequest;
    let approverTask;
    before('attach workflow', function testFunction(done) {
      models.WorkflowManager.attachWorkflow({
        operation: 'create',
        modelName: 'StoreV1',
        version: 'v1',
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
      models.WorkflowManager.detachWorkflowWithVersion(workflowMapping.id, workflowMapping._version, bootstrap.defaultContext, function testFunction(err) {
        expect(err).to.not.exist;
        models.StoreV1.destroyAll({}, {_skip_wf: true}, done);
      });
    });


    beforeEach(function testFunction(done) {
      bootstrap.removeUserTaskListener(workflowName, 'Approval');
      async.parallel([
        function f1(cb) {
          bootstrap.onUserTask(workflowName, 'Approval', function testFunction(err, task, instance) {
            expect(err).to.not.exist;
            approverTask = task;
            setTimeout(function allowWFRCreate() {
              models.WorkflowRequest.find({where: {
                modelName: 'StoreV1',
                modelInstanceId: instance._processVariables.id
              }}, bootstrap.defaultContext, function testFunction(err, changeRequests) {
                expect(err).to.not.exist;
                expect(changeRequests).to.exist.and.be.an('array').of.length(1);
                changeRequest = changeRequests[0];
                models.WorkflowInstance.findById(changeRequest.processId, bootstrap.defaultContext, function testFunction(err, wfInst) {
                  expect(err).to.not.exist;
                  expect(wfInst).to.exist;
                  workflowInstance = wfInst;
                  cb();
                });
              });
            }, 1000);
          });
        },
        function f2(cb) {
          models.StoreV1.create(storeData, bootstrap.getContext('usr1'), function testFunction(err, tkt) {
            expect(err).to.not.exist;
            expect(tkt).to.exist;
            storeRecord = tkt;
            cb();
          });
        }
      ], function asyncCb(err, results) {
        done(err);
      });
    });

    afterEach(function testFunction(done) {
      intermediateCleanup(done);
    });

    it('creates record with status as private', function testFunction(done) {
      expect(storeRecord).to.exist;
      expect(storeRecord).to.have.property('_status').that.equals('private');
      expect(storeRecord).to.have.property('_transactionType').that.equals('create');
      done();
    });

    it('triggers the workflow', function testFunction(done) {
      expect(workflowInstance).to.exist;
      done();
    });

    it('model.workflow returns the workflow', function testFunction(done) {
      expect(storeRecord).to.exist;
      models.StoreV1.workflow(storeRecord.id, bootstrap.defaultContext, function testFunction(err, wfInst) {
        expect(err).to.not.exist;
        expect(wfInst).to.exist;
        expect(wfInst.workflowDefinitionName).to.equal(workflowName);
        expect(wfInst.id).to.deep.equal(workflowInstance.id);
        expect(wfInst.processes).to.exist;
        done();
      });
    });

    it('model.workflow returns error if id is not specified', function testFunction(done) {
      expect(storeRecord).to.exist;
      models.StoreV1.workflow(null, bootstrap.defaultContext, function testFunction(err, wfInst) {
        expect(err).to.exist;
        expect(err.message).to.include('id is required to find attached Workflow Instance');
        done();
      });
    });

    it('model.tasks returns the tasks', function testFunction(done) {
      expect(storeRecord).to.exist;
      models.StoreV1.tasks(storeRecord.id, bootstrap.defaultContext, function testFunction(err, tasks) {
        expect(err).to.not.exist;
        expect(tasks).to.exist.and.be.an('array').of.length(1);
        done();
      });
    });

    it('model.tasks returns error if id is not specified', function testFunction(done) {
      expect(storeRecord).to.exist;
      models.StoreV1.tasks(null, bootstrap.defaultContext, function testFunction(err, tasks) {
        expect(err).to.exist;
        expect(err.message).to.include('id is required to find attached tasks');
        done();
      });
    });


    xit('BROKEN: record is NOT visible to other users', function testFunction(done) {
      expect(storeRecord).to.exist;
      models.StoreV1.find({}, bootstrap.getContext('usr2'), function testFunction(err, records) {
        expect(err).to.not.exist;
        expect(records).to.exist.and.be.an('array').of.length(0);
        done();
      });
    });

    it('record can NOT be updated when in private state', function testFunction(done) {
      expect(storeRecord).to.exist;
      storeRecord.updateAttributes({
        sequence: 1001,
        _version: storeRecord._version
      }, bootstrap.getContext('usr3'), function testFunction(err, tkt) {
        expect(err).to.exist;
        expect(err.statusCode).to.equal(403);
        expect(err.code).to.equal('ATTACH_WORKFLOW_BAD_REQUEST');
        expect(err.message).to.include('Update not allowed while instance is in private state');
        expect(tkt).to.not.exist;
        done();
      });
    });

    it('record can NOT be deleted by other users when in private state', function testFunction(done) {
      expect(storeRecord).to.exist;
      storeRecord.delete(bootstrap.getContext('usr4'), function testFunction(err, response) {
        expect(err).to.exist;
        expect(response).to.not.exist;
        done();
      });
    });

    it('When Approved, record is finalized and made public', function testFunction(done) {
      bootstrap.onComplete(workflowName, function testFunction(err, instance) {
        expect(err).to.not.exist;
        stateVerifier.isComplete(instance);

        stateVerifier.verifyTokens(instance, ['Start', 'Approval', 'finalizeMode', 'Approve', 'End']);
        models.StoreV1.find({}, bootstrap.defaultContext, function testFunction(err, records) {
          expect(err).to.not.exist;
          expect(records).to.exist.and.be.an('array').of.length(1);
          expect(records[0]._status).to.equal('public');
          // _verifiedBy Does not work
          // expect(records[0]._verifiedBy).to.equal('usr2');

          // models.StoreV1.workflow(records[0].id, bootstrap.defaultContext, function(err, wfInst){
          //   expect(err).to.not.exist;
          //   expect(wfInst).to.not.exist;
          done();
          // });
        });
      });

      expect(approverTask).to.exist;
      approverTask.complete({}, bootstrap.getContext('usr2'), function testFunction(err, task) {
        expect(err).to.not.exist;
        expect(task).to.exist;
        expect(task.status).to.equal(Status.COMPLETE);
      });
    });

    it('When Rejected, record is removed', function testFunction(done) {
      bootstrap.onComplete(workflowName, function testFunction(err, instance) {
        expect(err).to.not.exist;
        stateVerifier.isComplete(instance);

        stateVerifier.verifyTokens(instance, ['Start', 'Approval', 'finalizeMode', 'Reject', 'End']);
        models.StoreV1.find({}, bootstrap.defaultContext, function testFunction(err, records) {
          expect(err).to.not.exist;
          expect(records).to.be.an('array').of.length(0);
          // expect(records[0]._status).to.equal('public');
          // _verifiedBy Does not work
          // expect(records[0]._verifiedBy).to.equal('usr2');
          done();
        });
      });

      expect(approverTask).to.exist;
      approverTask.complete({
        pv: {
          finalizeMode: 'Reject'
        }
      }, bootstrap.getContext('usr2'), function testFunction(err, task) {
        expect(err).to.not.exist;
        expect(task).to.exist;
        expect(task.status).to.equal(Status.COMPLETE);
      });
    });


    it('When Approved viaMessage, record is finalized and made public', function testFunction(done) {
      bootstrap.onComplete(workflowName, function testFunction(err, instance) {
        expect(err).to.not.exist;
        stateVerifier.isComplete(instance);

        stateVerifier.verifyTokens(instance, ['Start', 'Approval', 'finalizeMode', 'viaMessage', 'End']);
        models.StoreV1.find({}, bootstrap.defaultContext, function testFunction(err, records) {
          expect(err).to.not.exist;
          expect(records).to.exist.and.be.an('array').of.length(1);
          expect(records[0]._status).to.equal('public');
          done();
        });
      });

      expect(approverTask).to.exist;
      approverTask.complete({
        pv: {
          finalizeMode: 'viaMessage'
        },
        msg: {
          action: 'approved'
        }
      }, bootstrap.getContext('usr2'), function testFunction(err, task) {
        expect(err).to.not.exist;
        expect(task).to.exist;
        expect(task.status).to.equal(Status.COMPLETE);
      });
    });

    it('When Rejected viaMessage, record is removed', function testFunction(done) {
      bootstrap.onComplete(workflowName, function testFunction(err, instance) {
        expect(err).to.not.exist;
        stateVerifier.isComplete(instance);

        stateVerifier.verifyTokens(instance, ['Start', 'Approval', 'finalizeMode', 'viaMessage', 'End']);
        models.StoreV1.find({}, bootstrap.defaultContext, function testFunction(err, records) {
          expect(err).to.not.exist;
          expect(records).to.be.an('array').of.length(0);
          done();
        });
      });

      expect(approverTask).to.exist;
      approverTask.complete({
        pv: {
          finalizeMode: 'viaMessage'
        },
        msg: {
          action: 'rejected'
        }
      }, bootstrap.getContext('usr2'), function testFunction(err, task) {
        expect(err).to.not.exist;
        expect(task).to.exist;
        expect(task.status).to.equal(Status.COMPLETE);
      });
    });

    it('When Approved viaPV, record is finalized and made public', function testFunction(done) {
      bootstrap.onComplete(workflowName, function testFunction(err, instance) {
        expect(err).to.not.exist;
        stateVerifier.isComplete(instance);

        stateVerifier.verifyTokens(instance, ['Start', 'Approval', 'finalizeMode', 'viaPV', 'End']);
        models.StoreV1.find({}, bootstrap.defaultContext, function testFunction(err, records) {
          expect(err).to.not.exist;
          expect(records).to.exist.and.be.an('array').of.length(1);
          expect(records[0]._status).to.equal('public');
          done();
        });
      });

      expect(approverTask).to.exist;
      approverTask.complete({
        pv: {
          finalizeMode: 'viaPV',
          action: 'approved'
        }
      }, bootstrap.getContext('usr2'), function testFunction(err, task) {
        expect(err).to.not.exist;
        expect(task).to.exist;
        expect(task.status).to.equal(Status.COMPLETE);
      });
    });

    it('When Rejected viaPV, record is removed', function testFunction(done) {
      bootstrap.onComplete(workflowName, function testFunction(err, instance) {
        expect(err).to.not.exist;
        stateVerifier.isComplete(instance);

        stateVerifier.verifyTokens(instance, ['Start', 'Approval', 'finalizeMode', 'viaPV', 'End']);
        models.StoreV1.find({}, bootstrap.defaultContext, function testFunction(err, records) {
          expect(err).to.not.exist;
          expect(records).to.be.an('array').of.length(0);
          done();
        });
      });

      expect(approverTask).to.exist;
      approverTask.complete({
        pv: {
          finalizeMode: 'viaPV',
          action: 'rejected'
        }
      }, bootstrap.getContext('usr2'), function testFunction(err, task) {
        expect(err).to.not.exist;
        expect(task).to.exist;
        expect(task.status).to.equal(Status.COMPLETE);
      });
    });
  });

  describe('When operation has workflow attached on UPDATE operation', function testFunction() {
    let storeData = {
      owner: 'Julia',
      sequence: 1111
    };
    let storeRecord;
    let workflowInstance;
    let workflowMapping;
    let changeRequest;
    let approverTask;
    before('attach workflow', function testFunction(done) {
      models.WorkflowManager.attachWorkflow({
        operation: 'update',
        modelName: 'StoreV1',
        version: 'v1',
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
      models.WorkflowManager.detachWorkflowWithVersion(workflowMapping.id, workflowMapping._version, bootstrap.defaultContext, function testFunction(err) {
        expect(err).to.not.exist;
        models.StoreV1.destroyAll({}, done);
      });
    });

    beforeEach(function testFunction(done) {
      bootstrap.onUserTask(workflowName, 'Approval', function testFunction(err, task, instance) {
        expect(err).to.not.exist;
        approverTask = task;
        models.WorkflowRequest.find({
          modelName: 'StoreV1',
          modelId: storeRecord.id.toString()
        }, bootstrap.defaultContext, function testFunction(err, changeRequests) {
          expect(err).to.not.exist;
          expect(changeRequests).to.exist.and.be.an('array').of.length(1);
          changeRequest = changeRequests[0];
          models.WorkflowInstance.findById(changeRequest.processId, bootstrap.defaultContext, function testFunction(err, wfInst) {
            expect(err).to.not.exist;
            expect(wfInst).to.exist;
            workflowInstance = wfInst;
            done();
          });
        });
      });


      models.StoreV1.create(storeData, bootstrap.getContext('usr1'), function testFunction(err, tkt) {
        expect(err).to.not.exist;
        expect(tkt).to.exist;
        storeRecord = tkt;
        expect(storeRecord._status).to.be.empty;
        expect(storeRecord._transactionType).to.be.empty;
        let delta = {
          sequence: 2222,
          _version: storeRecord._version
        };
        storeRecord.updateAttributes(delta, bootstrap.getContext('usr1'), function testFunction(err, tkt) {
          expect(err).to.not.exist;
          expect(tkt).to.exist;
          storeRecord = tkt;
        });
      });
    });

    afterEach(function testFunction(done) {
      intermediateCleanup(done);
    });

    it('updates the record with status as private', function testFunction(done) {
      expect(storeRecord).to.exist;
      expect(storeRecord).to.have.property('_status').that.equals('private');
      expect(storeRecord).to.have.property('_transactionType').that.equals('update');
      done();
    });

    it('triggers the workflow', function testFunction(done) {
      expect(workflowInstance).to.exist;
      done();
    });

    xit('BROKEN: changes are NOT visible to other users', function testFunction(done) {
      models.StoreV1.find({}, bootstrap.getContext('usr2'), function testFunction(err, records) {
        expect(err).to.not.exist;
        expect(records).to.exist.and.be.an('array').of.length(1);
        expect(records[0].sequence).to.equal(1111);
        expect(records[0].sequence).to.not.equal(2222);
        done();
      });
    });

    it('When Approved, record is finalized and made public', function testFunction(done) {
      bootstrap.onComplete(workflowName, function testFunction(err, instance) {
        expect(err).to.not.exist;
        stateVerifier.isComplete(instance);

        stateVerifier.verifyTokens(instance, ['Start', 'Approval', 'finalizeMode', 'Approve', 'End']);
        models.StoreV1.find({}, bootstrap.defaultContext, function testFunction(err, records) {
          expect(err).to.not.exist;
          expect(records).to.exist.and.be.an('array').of.length(1);
          expect(records[0]._status).to.equal('public');
          expect(records[0].sequence).to.equal(2222);
          done();
        });
      });

      expect(approverTask).to.exist;
      approverTask.complete({}, bootstrap.getContext('usr2'), function testFunction(err, task) {
        expect(err).to.not.exist;
        expect(task).to.exist;
        expect(task.status).to.equal(Status.COMPLETE);
      });
    });

    it('When Rejected, record is reverted', function testFunction(done) {
      bootstrap.onComplete(workflowName, function testFunction(err, instance) {
        expect(err).to.not.exist;
        stateVerifier.isComplete(instance);

        stateVerifier.verifyTokens(instance, ['Start', 'Approval', 'finalizeMode', 'Reject', 'End']);
        models.StoreV1.find({}, bootstrap.defaultContext, function testFunction(err, records) {
          expect(err).to.not.exist;
          expect(records).to.be.an('array').of.length(1);
          expect(records[0]._status).to.equal('public');
          expect(records[0].sequence).to.equal(1111);
          done();
        });
      });

      expect(approverTask).to.exist;
      approverTask.complete({
        pv: {
          finalizeMode: 'Reject'
        }
      }, bootstrap.getContext('usr2'), function testFunction(err, task) {
        expect(err).to.not.exist;
        expect(task).to.exist;
        expect(task.status).to.equal(Status.COMPLETE);
      });
    });


    it('When same record is updated again, previous workflow is terminated and new one is triggered', function testFunction(done) {
      async.parallel([function testFunction(cb) {
        bootstrap.onComplete(workflowName, function testFunction(err, instance) {
          expect(err).to.not.exist;
          stateVerifier.isComplete(instance);
          stateVerifier.verifyTokens(instance, ['Start', 'Approval', 'finalizeMode', 'Approve', 'End']);
          models.StoreV1.find({}, bootstrap.defaultContext, function testFunction(err, records) {
            expect(err).to.not.exist;
            expect(records).to.exist.and.be.an('array').of.length(1);
            expect(records[0]._status).to.equal('public');
            expect(records[0].sequence).to.equal(3333);
            cb();
          });
        });
      }, function testFunction(cb) {
        bootstrap.onWorkflowTerminated(workflowName, function testFunction(err, wfInst) {
          expect(err).to.not.exist;
          expect(wfInst).to.exist;
          expect(wfInst.processVariables).to.exist;
          expect(wfInst.processVariables._modelInstance).to.exist.and.have.a.property('sequence').that.equals(2222);
          expect(wfInst.status).to.equal(Status.TERMINATED);
          cb();
        });
      }], function testFunction(err, results) {
        done(err);
      });

      bootstrap.onUserTask(workflowName, 'Approval', function testFunction(err, task, instance) {
        expect(err).to.not.exist;
        expect(task).to.exist;
        expect(task.id).to.not.equal(approverTask.id);
        approverTask = task;
        approverTask.complete({}, bootstrap.getContext('usr2'), function testFunction(err, task) {
          expect(err).to.not.exist;
          expect(task).to.exist;
          expect(task.status).to.equal(Status.COMPLETE);
        });
      });

      let delta = {
        sequence: 3333,
        _version: storeRecord._version
      };
      storeRecord.updateAttributes(delta, bootstrap.getContext('usr1'), function testFunction(err, tkt) {
        expect(err).to.not.exist;
        expect(tkt).to.exist;
        storeRecord = tkt;
      });
    });

    it('when update approval is pending, same record update by another user throws error', function testFunction(done) {
      bootstrap.onUserTask(workflowName, 'Approval', function testFunction(err, task, instance) {
        expect(err).to.not.exist;
        expect(task).to.exist;
        let delta2 = {
          sequence: 4444,
          _version: storeRecord._version
        };
        storeRecord.updateAttributes(delta2, bootstrap.getContext('usr2'), function testFunction(err, tkt) {
          expect(err).to.exist;
          expect(tkt).to.not.exist;
          expect(err.message).to.include('Update not allowed by a different user in private state');
          expect(err.code).to.equal('ATTACH_WORKFLOW_BAD_REQUEST');
          expect(err.statusCode).to.equal(403);
          done();
        });
      });

      let delta = {
        sequence: 3333,
        _version: storeRecord._version
      };
      storeRecord.updateAttributes(delta, bootstrap.getContext('usr1'), function testFunction(err, tkt) {
        expect(err).to.not.exist;
        expect(tkt).to.exist;
        storeRecord = tkt;
      });
    });
  });

  describe('When operation has workflow attached on SAVE operation', function testFunction() {
    let storeData = {
      owner: 'Julia',
      sequence: 5555
    };
    let storeRecord;
    let workflowInstance;
    let workflowMapping;
    let changeRequest;
    let approverTask;
    before('attach workflow', function testFunction(done) {
      models.WorkflowManager.attachWorkflow({
        operation: 'save',
        modelName: 'StoreV1',
        version: 'v1',
        wfDependent: true,
        workflowBody: {
          workflowDefinitionName: workflowName
        }
      }, bootstrap.defaultContext, function testFunction(err, mappings) {
        expect(err).to.not.exist;
        expect(mappings).to.exist;
        expect(mappings.mappings).to.exist.and.be.an('array').of.length(1);
        workflowMapping = mappings.mappings[0];

        bootstrap.onUserTask(workflowName, 'Approval', function testFunction(err, task, instance) {
          expect(err).to.not.exist;
          approverTask = task;
          models.WorkflowRequest.find({
            modelName: 'StoreV1',
            modelId: storeRecord.id.toString()
          }, bootstrap.defaultContext, function testFunction(err, changeRequests) {
            expect(err).to.not.exist;
            expect(changeRequests).to.exist.and.be.an('array').of.length(1);
            changeRequest = changeRequests[0];
            models.WorkflowInstance.findById(changeRequest.processId, bootstrap.defaultContext, function testFunction(err, wfInst) {
              expect(err).to.not.exist;
              expect(wfInst).to.exist;
              workflowInstance = wfInst;
              done();
            });
          });
        });

        models.StoreV1.create(storeData, bootstrap.getContext('usr1'), function testFunction(err, tkt) {
          expect(err).to.not.exist;
          expect(tkt).to.exist;
          storeRecord = tkt;
        });
      });
    });

    after('cleanup', function testFunction(done) {
      models.WorkflowManager.detachWorkflowWithVersion(workflowMapping.id, workflowMapping._version, bootstrap.defaultContext, function testFunction(err) {
        expect(err).to.not.exist;
        models.StoreV1.destroyAll({}, function cb() {
          intermediateCleanup(done);
        });
      });
    });

    it('creates the record with status as private', function testFunction(done) {
      expect(storeRecord).to.exist;
      expect(storeRecord).to.have.property('_status').that.equals('private');
      expect(storeRecord).to.have.property('_transactionType').that.equals('create');
      done();
    });

    it('triggers the workflow', function testFunction(done) {
      expect(workflowInstance).to.exist;
      done();
    });

    it('When Approved, record is finalized and made public', function testFunction(done) {
      bootstrap.onComplete(workflowName, function testFunction(err, instance) {
        expect(err).to.not.exist;
        stateVerifier.isComplete(instance);

        stateVerifier.verifyTokens(instance, ['Start', 'Approval', 'finalizeMode', 'Approve', 'End']);
        models.StoreV1.find({}, bootstrap.defaultContext, function testFunction(err, records) {
          expect(err).to.not.exist;
          expect(records).to.exist.and.be.an('array').of.length(1);
          expect(records[0]._status).to.equal('public');
          expect(records[0].sequence).to.equal(5555);
          storeRecord = records[0];
          done();
        });
      });

      expect(approverTask).to.exist;
      approverTask.complete({}, bootstrap.getContext('usr2'), function testFunction(err, task) {
        expect(err).to.not.exist;
        expect(task).to.exist;
        expect(task.status).to.equal(Status.COMPLETE);
      });
    });

    it('workflow triggers on update', function testFunction(done) {
      bootstrap.onUserTask(workflowName, 'Approval', function testFunction(err, task, instance) {
        expect(err).to.not.exist;
        expect(task).to.exist;
        done();
      });

      let delta = {
        sequence: 3333,
        _version: storeRecord._version
      };
      storeRecord.updateAttributes(delta, bootstrap.getContext('usr1'), function testFunction(err, tkt) {
        expect(err).to.not.exist;
        expect(tkt).to.exist;
        storeRecord = tkt;
      });
    });
  });

  describe.skip('When operation has workflow attached on DELETE operation', function testFunction() {
    let storeData = {
      owner: 'Julia',
      sequence: 1111
    };
    let storeRecord;
    let workflowMapping;
    let workflowInstance;
    let changeRequest;
    let approverTask;
    before('attach workflow', function testFunction(done) {
      models.WorkflowManager.attachWorkflow({
        operation: 'delete',
        modelName: 'StoreV1',
        version: 'v1',
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
      models.WorkflowManager.detachWorkflowWithVersion(workflowMapping.id, workflowMapping._version, bootstrap.defaultContext, function testFunction(err) {
        expect(err).to.not.exist;
        models.StoreV1.destroyAll({}, done);
      });
    });

    beforeEach(function testFunction(done) {
      bootstrap.onUserTask(workflowName, 'Approval', function testFunction(err, task, instance) {
        expect(err).to.not.exist;
        approverTask = task;
        models.WorkflowRequest.find({
          modelName: 'StoreV1',
          modelId: storeRecord.id.toString()
        }, bootstrap.defaultContext, function testFunction(err, changeRequests) {
          expect(err).to.not.exist;
          expect(changeRequests).to.exist.and.be.an('array').of.length(1);
          changeRequest = changeRequests[0];
          models.WorkflowInstance.findById(changeRequest.processId, bootstrap.defaultContext, function testFunction(err, wfInst) {
            expect(err).to.not.exist;
            expect(wfInst).to.exist;
            workflowInstance = wfInst;
            done();
          });
        });
      });


      models.StoreV1.create(storeData, bootstrap.getContext('usr1'), function testFunction(err, tkt) {
        expect(err).to.not.exist;
        expect(tkt).to.exist;
        storeRecord = tkt;
        expect(storeRecord._status).to.be.empty;
        expect(storeRecord._transactionType).to.be.empty;
        storeRecord.delete(bootstrap.getContext('usr1'), function testFunction(err, tkt) {
          expect(err).to.not.exist;
          expect(tkt).to.exist.and.have.property('count').that.equals(1);
        });
      });
    });

    afterEach(function testFunction(done) {
      intermediateCleanup(done);
    });

    it('updates the record with status as private', function testFunction(done) {
      expect(storeRecord).to.exist;
      expect(storeRecord).to.have.property('_status').that.equals('private');
      expect(storeRecord).to.have.property('_transactionType').that.equals('delete');
      done();
    });

    it('triggers the workflow', function testFunction(done) {
      expect(workflowInstance).to.exist;
      done();
    });

    xit('BROKEN: changes are NOT visible to other users', function testFunction(done) {
      models.StoreV1.find({}, bootstrap.getContext('usr2'), function testFunction(err, records) {
        expect(err).to.not.exist;
        expect(records).to.exist.and.be.an('array').of.length(1);
        expect(records[0].sequence).to.equal(1111);
        expect(records[0].sequence).to.not.equal(2222);
        done();
      });
    });

    it('When Approved, record is finalized and made public', function testFunction(done) {
      bootstrap.onComplete(workflowName, function testFunction(err, instance) {
        expect(err).to.not.exist;
        stateVerifier.isComplete(instance);
        stateVerifier.verifyTokens(instance, ['Start', 'Approval', 'finalizeMode', 'Approve', 'End']);
        models.StoreV1.find({}, bootstrap.defaultContext, function testFunction(err, records) {
          expect(err).to.not.exist;
          expect(records).to.exist.and.be.an('array').of.length(1);
          expect(records[0]._status).to.equal('public');
          expect(records[0].sequence).to.equal(2222);
          done();
        });
      });

      expect(approverTask).to.exist;
      approverTask.complete({}, bootstrap.getContext('usr2'), function testFunction(err, task) {
        expect(err).to.not.exist;
        expect(task).to.exist;
        expect(task.status).to.equal(Status.COMPLETE);
      });
    });

    xit('When Rejected, record is reverted', function testFunction(done) {
      bootstrap.onComplete(workflowName, function testFunction(err, instance) {
        expect(err).to.not.exist;
        stateVerifier.isComplete(instance);

        stateVerifier.verifyTokens(instance, ['Start', 'Approval', 'finalizeMode', 'Reject', 'End']);
        models.StoreV1.find({}, bootstrap.defaultContext, function testFunction(err, records) {
          expect(err).to.not.exist;
          expect(records).to.be.an('array').of.length(1);
          expect(records[0]._status).to.equal('public');
          expect(records[0].sequence).to.equal(1111);
          done();
        });
      });

      expect(approverTask).to.exist;
      approverTask.complete({
        pv: {
          finalizeMode: 'Reject'
        }
      }, bootstrap.getContext('usr2'), function testFunction(err, task) {
        expect(err).to.not.exist;
        expect(task).to.exist;
        expect(task.status).to.equal(Status.COMPLETE);
      });
    });
  });

  describe.skip('Implicit Child Posts : SAVE operation', function testFunction() {
    let storeData = {
      owner: 'Julia',
      sequence: 1111
    };
    let storeRecord;
    let workflowMapping;
    let workflowInstance;
    let changeRequest;
    let approverTask;
    before('attach workflow', function testFunction(done) {
      models.WorkflowManager.attachWorkflow({
        operation: 'save',
        modelName: 'StoreV1',
        version: 'v1',
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
      models.WorkflowManager.detachWorkflowWithVersion(workflowMapping.id, workflowMapping._version, bootstrap.defaultContext, function testFunction(err) {
        expect(err).to.not.exist;
        models.StoreV1.destroyAll({}, done);
      });
    });

    beforeEach(function testFunction(done) {
      bootstrap.onUserTask(workflowName, 'Approval', function testFunction(err, task, instance) {
        expect(err).to.not.exist;
        approverTask = task;
        models.WorkflowRequest.find({
          modelName: 'StoreV1',
          modelId: storeRecord.id.toString()
        }, bootstrap.defaultContext, function testFunction(err, changeRequests) {
          expect(err).to.not.exist;
          expect(changeRequests).to.exist.and.be.an('array').of.length(1);
          changeRequest = changeRequests[0];
          models.WorkflowInstance.findById(changeRequest.processId, bootstrap.defaultContext, function testFunction(err, wfInst) {
            expect(err).to.not.exist;
            expect(wfInst).to.exist;
            workflowInstance = wfInst;
            done();
          });
        });
      });


      models.StoreV1.create(storeData, bootstrap.getContext('usr1'), function testFunction(err, tkt) {
        expect(err).to.not.exist;
        expect(tkt).to.exist;
        storeRecord = tkt;
        expect(storeRecord._status).to.be.empty;
        expect(storeRecord._transactionType).to.be.empty;
        let delta = {
          sequence: 2222,
          _version: storeRecord._version
        };
        storeRecord.updateAttributes(delta, bootstrap.getContext('usr1'), function testFunction(err, tkt) {
          expect(err).to.not.exist;
          expect(tkt).to.exist;
          storeRecord = tkt;
        });
      });
    });

    afterEach(function testFunction(done) {
      intermediateCleanup(done);
    });

    it('updates the record with status as private', function testFunction(done) {
      expect(storeRecord).to.exist;
      expect(storeRecord).to.have.property('_status').that.equals('private');
      expect(storeRecord).to.have.property('_transactionType').that.equals('update');
      done();
    });

    it('triggers the workflow', function testFunction(done) {
      expect(workflowInstance).to.exist;
      done();
    });

    xit('BROKEN: changes are NOT visible to other users', function testFunction(done) {
      models.StoreV1.find({}, bootstrap.getContext('usr2'), function testFunction(err, records) {
        expect(err).to.not.exist;
        expect(records).to.exist.and.be.an('array').of.length(1);
        expect(records[0].sequence).to.equal(1111);
        expect(records[0].sequence).to.not.equal(2222);
        done();
      });
    });

    xit('When Approved, record is finalized and made public', function testFunction(done) {
      bootstrap.onComplete(workflowName, function testFunction(err, instance) {
        expect(err).to.not.exist;
        stateVerifier.isComplete(instance);

        stateVerifier.verifyTokens(instance, ['Start', 'Approval', 'finalizeMode', 'Approve', 'End']);
        models.StoreV1.find({}, bootstrap.defaultContext, function testFunction(err, records) {
          expect(err).to.not.exist;
          expect(records).to.exist.and.be.an('array').of.length(1);
          expect(records[0]._status).to.equal('public');
          expect(records[0].sequence).to.equal(2222);
          done();
        });
      });

      expect(approverTask).to.exist;
      approverTask.complete({}, bootstrap.getContext('usr2'), function testFunction(err, task) {
        expect(err).to.not.exist;
        expect(task).to.exist;
        expect(task.status).to.equal(Status.COMPLETE);
      });
    });

    xit('When Rejected, record is reverted', function testFunction(done) {
      bootstrap.onComplete(workflowName, function testFunction(err, instance) {
        expect(err).to.not.exist;
        stateVerifier.isComplete(instance);

        stateVerifier.verifyTokens(instance, ['Start', 'Approval', 'finalizeMode', 'Reject', 'End']);
        models.StoreV1.find({}, bootstrap.defaultContext, function testFunction(err, records) {
          expect(err).to.not.exist;
          expect(records).to.be.an('array').of.length(1);
          expect(records[0]._status).to.equal('public');
          expect(records[0].sequence).to.equal(1111);
          done();
        });
      });

      expect(approverTask).to.exist;
      approverTask.complete({
        pv: {
          finalizeMode: 'Reject'
        }
      }, bootstrap.getContext('usr2'), function testFunction(err, task) {
        expect(err).to.not.exist;
        expect(task).to.exist;
        expect(task.status).to.equal(Status.COMPLETE);
      });
    });
  });
});
