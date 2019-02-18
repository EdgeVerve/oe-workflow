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
let OrderV0 = bootstrap.app.models.OrderV0;
let WorkflowManager = bootstrap.app.models.WorkflowManager;
let ChangeWorkflowRequest = bootstrap.app.models.ChangeWorkflowRequest;
let models = bootstrap.app.models;
let async = require('async');


describe('Maker Checker V2 Custom remote Tests:', function CB() {
  let workflowName = 'maker-checker-v2-custom-remote';

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
    before('create record', function testFunction(done) {
      OrderV0.create({
        buyer: 'Jack',
        quantity: 54
      }, bootstrap.getContext('usr1'), function testFunction(err, ord) {
        expect(err).to.not.exist;
        expect(ord).to.exist;
        done();
      });
    });

    after('cleanup', function testFunction(done) {
      OrderV0.destroyAll({}, done);
    });

    it('does not respond to new maker-checker API methods', function testFunction(done) {
      OrderV0 = bootstrap.loopback.getModel('OrderV0');
      expect(OrderV0).to.not.have.a.property('createX');
      expect(OrderV0).to.not.have.a.property('updateX');
      expect(OrderV0).to.not.have.a.property('deleteX');
      expect(OrderV0).to.not.have.a.property('customX');
      expect(OrderV0).to.not.have.a.property('findX');
      expect(OrderV0).to.not.have.a.property('findByIdX');
      expect(OrderV0).to.not.have.a.property('recall');
      expect(OrderV0).to.not.have.a.property('workflow');
      expect(OrderV0).to.not.have.a.property('tasks');
      done();
    });
  });

  describe('When workflow is attached to custom operation', function testFunction() {
    let workflowMapping;

    after('cleanup', function testFunction(done) {
      WorkflowManager.detachWorkflowWithVersion(workflowMapping.id, workflowMapping._version, bootstrap.defaultContext, function testFunction(err) {
        expect(err).to.not.exist;
        OrderV0.destroyAll({}, done);
      });
    });

    it('Throws error when operation is remote and no path is given in mapping', function testFunction(done) {
      WorkflowManager.attachWorkflow({
        operation: 'custom',
        modelName: 'OrderV0',
        version: 'v2',
        remote: {
          method: 'SpclOrderBYId',
          verb: 'put'
        },
        mappingName: 'specialOrder',
        wfDependent: true,
        workflowBody: {
          workflowDefinitionName: workflowName
        }
      }, bootstrap.defaultContext, function testFunction(err, wfmappings) {
        expect(err).to.exist;
        expect(err.message).to.include('remote parameters (path,method,verb) are required for custom operation');
        expect(wfmappings).to.not.exist;
        done();
      });
    });

    it('Throws error when operation is custom and no method is given in mapping', function testFunction(done) {
      WorkflowManager.attachWorkflow({
        operation: 'custom',
        modelName: 'OrderV0',
        version: 'v2',
        remote: {
          path: '/special-order/:id',
          verb: 'put'
        },
        mappingName: 'specialOrder',
        wfDependent: true,
        workflowBody: {
          workflowDefinitionName: workflowName
        }
      }, bootstrap.defaultContext, function testFunction(err, wfmappings) {
        expect(err).to.exist;
        expect(err.message).to.include('remote parameters (path,method,verb) are required for custom operation');
        expect(wfmappings).to.not.exist;
        done();
      });
    });

    it('Throws error when operation is custom and mappingName property is missing on mapping', function testFunction(done) {
      WorkflowManager.attachWorkflow({
        operation: 'custom',
        modelName: 'OrderV0',
        version: 'v2',
        remote: {
          path: '/special-order/:id',
          method: 'SpclOrderBYId',
          verb: 'put'
        },
        wfDependent: true,
        workflowBody: {
          workflowDefinitionName: workflowName
        }
      }, bootstrap.defaultContext, function testFunction(err, wfmappings) {
        expect(err).to.exist;
        expect(err.message).to.include('mappingName is required for custom operation');
        expect(wfmappings).not.to.exist;
        done();
      });
    });

    it('Attach workflow when all parameters are provided when operation is custom', function testFunction(done) {
      WorkflowManager.attachWorkflow({
        operation: 'custom',
        modelName: 'OrderV0',
        version: 'v2',
        remote: {
          path: '/special-order',
          verb: 'put',
          method: 'SpclOrder'
        },
        mappingName: 'isSpecialOrder',
        wfDependent: true,
        workflowBody: {
          workflowDefinitionName: workflowName
        }
      }, bootstrap.defaultContext, function testFunction(err, wfmappings) {
        expect(err).to.not.exist;
        expect(wfmappings).to.exist;
        workflowMapping = wfmappings.mappings[0];
        done();
      });
    });

    it('Check for new maker-checker API methods', function testFunction(done) {
      OrderV0 = bootstrap.loopback.getModel('OrderV0');
      expect(OrderV0).to.have.a.property('createX').that.is.a('function');
      expect(OrderV0).to.have.a.property('updateX').that.is.a('function');
      expect(OrderV0).to.have.a.property('deleteX').that.is.a('function');
      expect(OrderV0).to.have.a.property('customX').that.is.a('function');
      expect(OrderV0).to.have.a.property('findX').that.is.a('function');
      expect(OrderV0).to.have.a.property('findByIdX').that.is.a('function');
      expect(OrderV0).to.have.a.property('recall').that.is.a('function');
      expect(OrderV0).to.have.a.property('workflow').that.is.a('function');
      expect(OrderV0).to.have.a.property('tasks').that.is.a('function');
      done();
    });
  });

  describe('CustomX', function testFunction() {
    let orderRecord = [
      'Order1234',
      {
        buyer: 'Micheal',
        quantity: 442
      },
      'options'
    ];
    let order;
    let workflowMapping;
    let changeRequest;
    let workflowInstance;
    let approverTask;
    before('attach workflow', function testFunction(done) {
      WorkflowManager.attachWorkflow({
        operation: 'custom',
        modelName: 'OrderV0',
        version: 'v2',
        remote: {
          path: '/special-order/:id',
          verb: 'put',
          method: 'SpclOrderBYId'
        },
        mappingName: 'specialOrder',
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
        OrderV0.destroyAll({}, done);
      });
    });

    beforeEach(function testFunction(done) {
      async.parallel([
        function f1(cb) {
          bootstrap.onUserTask(workflowName, 'verify', function testFunction(err, task, instance) {
            expect(err).to.not.exist;
            approverTask = task;
            cb();
          });
        },
        function f2(cb) {
          OrderV0.customX('specialOrder', orderRecord, bootstrap.getContext('usr1'), function testFunction(err, ord) {
            expect(err).to.not.exist;
            expect(ord).to.exist;
            order = ord;
            ChangeWorkflowRequest.find({
              modelName: 'OrderV0',
              modelId: order.id
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
          models.OrderV0.destroyAll({}, callback);
        }
      ], function testFunction(err, results) {
        done(err);
      });
    });

    it('does not create record immediately', function testFunction(done) {
      OrderV0.find({}, bootstrap.defaultContext, function testFunction(err, records) {
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
      expect(changeRequest.operation).to.equal('custom');
      expect(changeRequest.id).to.deep.equal(order._changeRequestId);
      done();
    });

    it('workflow specified by changeRequest is running', function testFunction(done) {
      expect(workflowInstance).to.exist;
      workflowInstance.processes({}, bootstrap.defaultContext, function testFunction(err, procInstances) {
        expect(err).to.not.exist;
        expect(procInstances).to.exist.and.be.an('array').of.length(1);
        let processInstance = procInstances[0];
        stateVerifier.isRunning(processInstance);
        stateVerifier.verifyTokens(processInstance, ['start', {
          name: 'verify',
          status: Status.PENDING
        }]);
        stateVerifier.verifyPV(processInstance, {
          _operation: 'custom',
          _modelId: order.id,
          _maker_checker_impl: 'v2'
        });
        expect(processInstance._processVariables._modifiers).to.exist.and.be.an('array').that.has.members(['usr1']);
        expect(processInstance._processVariables._modelInstance).to.exist;
        expect(processInstance._processVariables._modelInstance[1].buyer).to.equal(order[1].buyer);
        expect(processInstance._processVariables._modelInstance[1].quantity).to.equal(order[1].quantity);
        done();
      });
    });

    it('Model.workflow fetches the running workflow', function testFunction(done) {
      OrderV0.workflow(order.id, bootstrap.defaultContext, function testFunction(err, wfInst) {
        expect(err).to.not.exist;
        expect(wfInst.id).to.deep.equal(workflowInstance.id);
        expect(wfInst.processes).to.exist;
        expect(wfInst.processes()).to.exist.and.be.an('array').of.length(1);
        done();
      });
    });

    it('REST: Model/workflow fetches the running workflow', function testFunction(done) {
      var url = bootstrap.basePath + '/OrderV0s/maker-checker/' + order.id + '/workflow';
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
      OrderV0.tasks(order.id, {}, bootstrap.defaultContext, function testFunction(err, tasks) {
        expect(err).to.not.exist;
        expect(tasks).to.exist.and.be.an('array').of.length(1);
        expect(tasks[0].status).to.equal(Status.PENDING);
        done();
      });
    });

    it('REST: Model/tasks fetches the tasks', function testFunction(done) {
      var url = bootstrap.basePath + '/OrderV0s/maker-checker/' + order.id + '/tasks';
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
        OrderV0.findById(order[0], bootstrap.defaultContext, function testFunction(err, record) {
          expect(err).to.not.exist;
          expect(record).to.exist;
          expect(record.buyer).to.equal(orderRecord[1].buyer);
          expect(record.quantity).to.equal(orderRecord[1].quantity);
          order = record;
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
        OrderV0.findById(order.id, bootstrap.defaultContext, function testFunction(err, record) {
          expect(err).to.not.exist;
          expect(record).to.not.exist;
          order = record;

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

    xit('Task Approver can provide additional changes', function testFunction(done) {
      bootstrap.onComplete(workflowName, function testFunction(err, instance) {
        expect(err).to.not.exist;
        stateVerifier.isComplete(instance);
        OrderV0.findById(order[0], bootstrap.defaultContext, function testFunction(err, record) {
          expect(err).to.not.exist;
          expect(record).to.exist;
          expect(record.buyer).to.equal(orderRecord[1].buyer);
          expect(record.quantity).to.not.equal(orderRecord[1].quantity);
          expect(record.quantity).to.equal(580);
          order = record;
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
        quantity: 580,
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
          OrderV0.findById(order.id, bootstrap.defaultContext, function testFunction(err, record) {
            expect(err).to.not.exist;
            expect(record).to.not.exist;
            done();
          });
        });
      });

      OrderV0.recall(order.id, bootstrap.getContext('usr2'), function testFunction(err, data) {
        expect(err).to.not.exist;
        expect(data).to.exist.and.have.property('success').that.equals(true);
      });
    });
  });
});
