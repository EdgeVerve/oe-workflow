/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

let bootstrap = require('../bootstrap.js');
let chai = bootstrap.chai;
let expect = chai.expect;
let Status = bootstrap.Status;
let Stock = bootstrap.app.models.Stock;
let WorkflowManager = bootstrap.app.models.WorkflowManager;
let ChangeWorkflowRequest = bootstrap.app.models.ChangeWorkflowRequest;
let models = bootstrap.app.models;
let async = require('async');

describe('correlationId maker checker v2 tests', function CB() {
  let workflowName = 'correlationid-maker-checker';

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

  describe('correlationId should be populated on changeworkflowRequest createX', function testFunction(done) {
    let stockRecord = {
      name: 'fog',
      quantityAvailable: 500
    };
    let ticket;
    let workflowMapping;
    let changeRequest;
    let workflowInstance;
    let approverTask;
    before('attach workflow', function testFunction(done) {
      WorkflowManager.attachWorkflow({
        operation: 'create',
        modelName: 'Stock',
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
        Stock.destroyAll({}, done);
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
          Stock.createX(stockRecord, bootstrap.getContext('usr1'), function testFunction(err, tkt) {
            expect(err).to.not.exist;
            expect(tkt).to.exist;
            ticket = tkt;
            ChangeWorkflowRequest.find({
              modelName: 'Stock',
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
          models.Stock.destroyAll({}, callback);
        }
      ], function testFunction(err, results) {
        done(err);
      });
    });

    it('correlationId should exists on changeRequest', function testFunction(done) {
      expect(changeRequest).to.exist;
      expect(changeRequest.correlationId).to.exist;
      expect(changeRequest.status).to.equal(Status.PENDING);
      done();
    });

    it('correlationId should exists on workflowinstance', function testFunction(done) {
      expect(workflowInstance).to.exist;
      expect(workflowInstance.correlationId).to.exist;
      done();
    });
  });

  describe('correlationId should be populated on changeworkflowRequest UpdateX', function testFunction(done) {
    let stockRecord = {
      name: 'parkAvenue',
      quantityAvailable: 500
    };
    let ticket;
    let workflowMapping;
    let changeRequest;
    let workflowInstance;
    let approverTask;
    before('attach workflow', function testFunction(done) {
      WorkflowManager.attachWorkflow({
        operation: 'update',
        modelName: 'Stock',
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
        Stock.destroyAll({}, done);
      });
    });

    beforeEach(function testFunction(done) {
      bootstrap.onUserTask(workflowName, 'Approver', function testFunction(err, task, instance) {
        expect(err).to.not.exist;
        approverTask = task;
        done();
      });

      Stock.create(stockRecord, bootstrap.getContext('usr1'), function testFunction(err, tkt) {
        expect(err).to.not.exist;
        expect(tkt).to.exist;
        expect(tkt.sequence).to.equal(stockRecord.sequence);
        tkt.quantityAvailable = 250;
        Stock.updateX(tkt.id, tkt.toObject(), bootstrap.getContext('usr2'), function testFunction(err, tkt) {
          expect(err).to.not.exist;
          expect(tkt).to.exist;
          ticket = tkt;
          ChangeWorkflowRequest.find({
            modelName: 'Stock',
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
          models.Stock.destroyAll({}, callback);
        }
      ], function testFunction(err, results) {
        done(err);
      });
    });

    it('correlationId should exists on changeRequest', function testFunction(done) {
      expect(changeRequest).to.exist;
      expect(changeRequest.correlationId).to.exist;
      expect(changeRequest.status).to.equal(Status.PENDING);
      done();
    });

    it('correlationId should exists on workflowinstance', function testFunction(done) {
      expect(workflowInstance).to.exist;
      expect(workflowInstance.correlationId).to.exist;
      done();
    });

  });

  describe('correlationId should be populated on changeworkflowRequest DeleteX', function testFunction(done){
    let stockRecord = {
      name: 'nivea',
      quantityAvailable: 1000
    };
    let ticket;
    let workflowMapping;
    let changeRequest;
    let workflowInstance;
    let approverTask;
    before('attach workflow', function testFunction(done) {
      WorkflowManager.attachWorkflow({
        operation: 'delete',
        modelName: 'Stock',
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
        Stock.destroyAll({}, done);
      });   
    });
    beforeEach(function testFunction(done) {
      bootstrap.onUserTask(workflowName, 'Approver', function testFunction(err, task, instance) {
        expect(err).to.not.exist;
        approverTask = task;
        done();
      });

      Stock.create(stockRecord, bootstrap.getContext('usr1'), function testFunction(err, tkt) {
        expect(err).to.not.exist;
        expect(tkt).to.exist;
        Stock.deleteX(tkt.id, tkt._version, bootstrap.getContext('usr2'), function testFunction(err, tkt) {
          expect(err).to.not.exist;
          expect(tkt).to.exist;
          ticket = tkt;
          ChangeWorkflowRequest.find({
            modelName: 'Stock',
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
          models.Stock.destroyAll({}, callback);
        }
      ], function testFunction(err, results) {
        done(err);
      });
    });

    it('correlationId should exists on changeRequest', function testFunction(done) {
      expect(changeRequest).to.exist;
      expect(changeRequest.correlationId).to.exist;
      expect(changeRequest.status).to.equal(Status.PENDING);
      done();
    });

    it('correlationId should exists on workflowinstance', function testFunction(done) {
      expect(workflowInstance).to.exist;
      expect(workflowInstance.correlationId).to.exist;
      done();
    });
  });
});