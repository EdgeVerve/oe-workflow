let bootstrap = require('../bootstrap.js');
let chai = bootstrap.chai;
let expect = chai.expect;
let Stock = bootstrap.app.models.Stock;
let WorkflowManager = bootstrap.app.models.WorkflowManager;
let ChangeWorkflowRequest = bootstrap.app.models.ChangeWorkflowRequest;
let WorkflowInstance = bootstrap.app.models.WorkflowInstance;
let ProcessInstance = bootstrap.app.models.ProcessInstance;
let Task = bootstrap.app.models.Task;
let async = require('async');
let Status = bootstrap.Status;

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
    let correlationid = 'abcdef';
    let stockRecord = {
      name: 'fog',
      quantityAvailable: 500,
      pv: {
        'correlationId': correlationid
      }
    };
    let ticket = {};
    let workflowMapping;

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
        Stock.createX(stockRecord, bootstrap.getContext('usr1'), function cb(err, instance) {
          expect(err).to.not.exist;
          expect(instance).to.exist;
          ticket.instanceId = instance.id;
          ticket.changeRequestId = instance._changeRequestId;
          done();
        });
      });
    });

    after('cleanup', function testFunction(done) {
      setTimeout(function timeout() {
        Stock.tasks(ticket.instanceId, {}, bootstrap.defaultContext, function testFunction(err, tasks) {
          expect(err).to.not.exist;
          expect(tasks[0].status).to.equal(Status.PENDING);
          tasks[0].complete({
            __action__: Status.APPROVED
          }, bootstrap.getContext('usr2'), function CB(err, task) {
            expect(err).to.not.exist;
            expect(task.status).to.equal(Status.COMPLETE);
            WorkflowManager.detachWorkflowWithVersion(workflowMapping.id, workflowMapping._version, bootstrap.defaultContext, function testFunction(err) {
              expect(err).to.not.exist;
              async.series([
                function testFunction(callback) {
                  WorkflowInstance.destroyAll({}, callback);
                },
                function testFunction(callback) {
                  ProcessInstance.destroyAll({}, callback);
                },
                function testFunction(callback) {
                  ChangeWorkflowRequest.destroyAll({}, callback);
                },
                function testFunction(callback) {
                  Task.destroyAll({}, callback);
                },
                function testFunction(callback) {
                  Stock.destroyAll({}, callback);
                }
              ], function testFunction(err) {
                done(err);
              });
            });
          });
        });
      }, 2000);
    });

    it('correlationId should be populated on ChangeWorkflowRequest', function CB(done) {
      ChangeWorkflowRequest.findById(ticket.changeRequestId, bootstrap.defaultContext, function cb(err, changeRequest) {
        expect(err).to.not.exist;
        expect(changeRequest.correlationId).to.exist;
        ticket.workflowInstanceId = changeRequest.workflowInstanceId;
        done();
      });
    });

    it('correlationId should be populated on WorkflowInstance', function CB(done) {
      WorkflowInstance.findById(ticket.workflowInstanceId, bootstrap.defaultContext, function cb(err, wfInst) {
        expect(err).to.not.exist;
        expect(wfInst.correlationId).to.exist;
        done();
      });
    });

    it('correlationId should be populated on ProcessInstance', function CB(done) {
      ProcessInstance.find({
        where: {
          workflowInstanceId: ticket.workflowInstanceId
        }
      }, bootstrap.defaultContext, function cb(err, procInst) {
        expect(err).to.not.exist;
        expect(procInst[0].correlationId).to.exist;
        ticket.processIntanceId = procInst[0].id;
        done();
      });
    });

    it('correlationId should be populated on Task', function CB(done) {
      setTimeout(function timeout() {
        Task.find({
          where: {
            processInstanceId: ticket.processInstanceId
          }
        }, bootstrap.defaultContext, function cb(err, task) {
          expect(err).to.not.exist;
          expect(task[0].correlationId).to.exist;
          done();
        });
      }, 4000);
    });
  });

  describe('correlationId should be populated on changeworkflowRequest updateX', function testFunction(done) {
    let correlationid = 'abc123';
    let stockRecord = {
      name: 'parkavenue',
      quantityAvailable: 1000
    };
    let ticket = {};
    let workflowMapping;

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
        Stock.create(stockRecord, bootstrap.getContext('usr1'), function cb(err, instance) {
          expect(err).to.not.exist;
          expect(instance).to.exist;
          expect(instance.quantityAvailable).to.equal(stockRecord.quantityAvailable);
          instance.quantityAvailable = 600;
          instance = JSON.parse(JSON.stringify(instance));
          instance.pv = {
            'correlationId': correlationid
          };
          Stock.updateX(instance.id, instance, bootstrap.getContext('usr2'), function testFunction(err, instance) {
            expect(err).to.not.exist;
            expect(instance).to.exist;
            ticket.instanceId = instance.id;
            ticket.changeRequestId = instance._changeRequestId;
            done();
          });
        });
      });
    });

    after('cleanup', function testFunction(done) {
      setTimeout(function timeout() {
        Stock.tasks(ticket.instanceId, {}, bootstrap.defaultContext, function testFunction(err, tasks) {
          expect(err).to.not.exist;
          expect(tasks[0].status).to.equal(Status.PENDING);
          tasks[0].complete({
            __action__: Status.APPROVED
          }, bootstrap.getContext('usr2'), function CB(err, task) {
            expect(err).to.not.exist;
            expect(task.status).to.equal(Status.COMPLETE);
            WorkflowManager.detachWorkflowWithVersion(workflowMapping.id, workflowMapping._version, bootstrap.defaultContext, function testFunction(err) {
              expect(err).to.not.exist;
              async.series([
                function testFunction(callback) {
                  WorkflowInstance.destroyAll({}, callback);
                },
                function testFunction(callback) {
                  ProcessInstance.destroyAll({}, callback);
                },
                function testFunction(callback) {
                  ChangeWorkflowRequest.destroyAll({}, callback);
                },
                function testFunction(callback) {
                  Task.destroyAll({}, callback);
                },
                function testFunction(callback) {
                  Stock.destroyAll({}, callback);
                }
              ], function testFunction(err, results) {
                done(err);
              });
            });
          });
        });
      }, 2000);
    });

    it('correlationId should be populated on ChangeWorkflowRequest', function CB(done) {
      ChangeWorkflowRequest.findById(ticket.changeRequestId, bootstrap.defaultContext, function cb(err, changeRequest) {
        expect(err).to.not.exist;
        expect(changeRequest.correlationId).to.exist;
        ticket.workflowInstanceId = changeRequest.workflowInstanceId;
        done();
      });
    });

    it('correlationId should be populated on WorkflowInstance', function CB(done) {
      WorkflowInstance.findById(ticket.workflowInstanceId, bootstrap.defaultContext, function cb(err, wfInst) {
        expect(err).to.not.exist;
        expect(wfInst.correlationId).to.exist;
        done();
      });
    });

    it('correlationId should be populated on ProcessInstance', function CB(done) {
      ProcessInstance.find({
        where: {
          workflowInstanceId: ticket.workflowInstanceId
        }
      }, bootstrap.defaultContext, function cb(err, procInst) {
        expect(err).to.not.exist;
        expect(procInst[0].correlationId).to.exist;
        ticket.processIntanceId = procInst[0].id;
        done();
      });
    });

    it('correlationId should be populated on Task', function CB(done) {
      setTimeout(function timeout() {
        Task.find({
          where: {
            processInstanceId: ticket.processInstanceId
          }
        }, bootstrap.defaultContext, function cb(err, task) {
          expect(err).to.not.exist;
          expect(task[0].correlationId).to.exist;
          done();
        });
      }, 4000);
    });
  });

  describe('correlationid should be populated on changeworkflowRequest deleteX', function testFunction(done) {
    let stockRecord = {
      name: 'nivea',
      quantityAvailable: 100
    };
    let ticket = {};
    let workflowMapping;

    before('attach workflow', function testFunction(done) {
      Stock.create(stockRecord, bootstrap.getContext('usr1'), function cb(err, instance) {
        expect(err).to.not.exist;
        expect(instance).to.exist;
        ticket.id = instance.id;
        ticket.version = instance._version;
      });
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
        Stock.deleteX(ticket.id, ticket.version, {
          headers: {
            'correlation-id': 'xyz123'
          }
        }, bootstrap.getContext('usr2'), function testFunction(err, instance) {
          expect(err).to.not.exist;
          expect(instance).to.exist;
          ticket.instanceId = instance.id;
          ticket.changeRequestId = instance._changeRequestId;
          done();
        });
      });
    });

    after('cleanup', function testFunction(done) {
      setTimeout(function timeout() {
        Stock.tasks(ticket.instanceId, {}, bootstrap.defaultContext, function testFunction(err, tasks) {
          expect(err).to.not.exist;
          expect(tasks[0].status).to.equal(Status.PENDING);
          tasks[0].complete({
            __action__: Status.APPROVED
          }, bootstrap.getContext('usr2'), function CB(err, task) {
            expect(err).to.not.exist;
            expect(task.status).to.equal(Status.COMPLETE);
            WorkflowManager.detachWorkflowWithVersion(workflowMapping.id, workflowMapping._version, bootstrap.defaultContext, function testFunction(err) {
              expect(err).to.not.exist;
              async.series([
                function testFunction(callback) {
                  WorkflowInstance.destroyAll({}, callback);
                },
                function testFunction(callback) {
                  ProcessInstance.destroyAll({}, callback);
                },
                function testFunction(callback) {
                  ChangeWorkflowRequest.destroyAll({}, callback);
                },
                function testFunction(callback) {
                  Task.destroyAll({}, callback);
                },
                function testFunction(callback) {
                  Stock.destroyAll({}, callback);
                }
              ], function testFunction(err, results) {
                done(err);
              });
            });
          });
        });
      }, 2000);
    });

    it('correlationId should be populated on ChangeWorkflowRequest', function CB(done) {
      ChangeWorkflowRequest.findById(ticket.changeRequestId, bootstrap.defaultContext, function cb(err, changeRequest) {
        expect(err).to.not.exist;
        expect(changeRequest.correlationId).to.exist;
        ticket.workflowInstanceId = changeRequest.workflowInstanceId;
        done();
      });
    });

    it('correlationId should be populated on WorkflowInstance', function CB(done) {
      WorkflowInstance.findById(ticket.workflowInstanceId, bootstrap.defaultContext, function cb(err, wfInst) {
        expect(err).to.not.exist;
        expect(wfInst.correlationId).to.exist;
        done();
      });
    });

    it('correlationId should be populated on ProcessInstance', function CB(done) {
      ProcessInstance.find({
        where: {
          workflowInstanceId: ticket.workflowInstanceId
        }
      }, bootstrap.defaultContext, function cb(err, procInst) {
        expect(err).to.not.exist;
        expect(procInst[0].correlationId).to.exist;
        ticket.processIntanceId = procInst[0].id;
        done();
      });
    });

    it('correlationId should be populated on Task', function CB(done) {
      setTimeout(function timeout() {
        Task.find({
          where: {
            processInstanceId: ticket.processInstanceId
          }
        }, bootstrap.defaultContext, function cb(err, task) {
          expect(err).to.not.exist;
          expect(task[0].correlationId).to.exist;
          done();
        });
      }, 4000);
    });
  });
});
