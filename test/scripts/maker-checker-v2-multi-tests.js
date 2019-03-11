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


describe('Multi Maker Checker V2 Tests', function CB() {
  let workflowName = 'maker-checker-v2-multi';

  let workflowMapping;
  let maker2Task;
  let approver1Task;

  function intermediateCleanup(done) {
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
        models.StoreV2.destroyAll({}, {
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

      WorkflowManager.attachWorkflow({
        operation: 'save',
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
  });
  after('cleanup', function testFunction(done) {
    WorkflowManager.detachWorkflowWithVersion(workflowMapping.id, workflowMapping._version, bootstrap.defaultContext, function testFunction(err) {
      expect(err).to.not.exist;
      StoreV2.destroyAll({}, function testFunction(err) {
        expect(err).to.not.exist;
        bootstrap.cleanUp(workflowName, done);
      });
    });
  });

  beforeEach(function testFunction(done) {
    bootstrap.onUserTask(workflowName, 'maker2', function testFunction(err, task, instance) {
      expect(err).to.not.exist;
      maker2Task = task;
      done();
    });
    StoreV2.createX({
      owner: 'John',
      sequence: 1000
    }, bootstrap.getContext('usr1'), function testFunction(err, tkt) {
      expect(err).to.not.exist;
      expect(tkt).to.exist;
    });
  });

  afterEach(function testFunction(done) {
    intermediateCleanup(done);
  });

  it('maker2 changes are reflected in change-request', function testFunction(done) {
    bootstrap.onUserTask(workflowName, 'approver1', function testFunction(err, task, instance) {
      expect(err).to.not.exist;
      approver1Task = task;
      expect(approver1Task.message).to.exist.and.have.property('text').that.equals('message to approver1');
      stateVerifier.isRunning(instance);
      stateVerifier.verifyTokens(instance, ['Start', 'maker2', {
        name: 'approver1',
        status: Status.PENDING
      }]);
      stateVerifier.verifyPV(instance, {
        maker2: 'maker2'
      });
      ChangeWorkflowRequest.find({
        workflowInstanceId: instance.workflowInstanceId
      }, bootstrap.defaultContext, function testFunction(err, changes) {
        expect(err).to.not.exist;
        expect(changes).to.be.an('array').of.length(1);
        let changeRequest = changes[0];
        expect(changeRequest._modifiers).to.exist.and.be.an('array').of.length(2);
        expect(changeRequest._modifiers).to.have.members(['usr1', 'usr2']);
        expect(changeRequest.data).to.exist;
        expect(changeRequest.data.sequence).to.equal(1001);
        done();
      });
    });

    expect(maker2Task).to.exist;
    maker2Task.complete({
      pv: {
        maker2: 'maker2'
      },
      msg: {
        text: 'message to approver1'
      },
      sequence: 1001
    }, bootstrap.getContext('usr2'), function testFunction(err, task) {
      expect(err).to.not.exist;
      expect(task).to.exist;
      expect(task.status).to.equal(Status.COMPLETE);
    });
  });

  it('checker-task complete errors if __action__ not provided', function testFunction(done) {
    bootstrap.onUserTask(workflowName, 'approver1', function testFunction(err, task, instance) {
      expect(err).to.not.exist;
      task.complete({}, bootstrap.getContext('usr3'), function testFunction(err, task) {
        expect(err).to.exist;
        expect(err.message).to.include('__action__ not provided. Checker enabled task requires this field.');
        expect(task).to.not.exist;
        done();
      });
    });

    maker2Task.complete({
      sequence: 1001
    }, bootstrap.getContext('usr2'), function testFunction(err, task) {
      expect(err).to.not.exist;
      expect(task.status).to.equal(Status.COMPLETE);
    });
  });

  it('checker-task complete errors if __action__ not valid', function testFunction(done) {
    bootstrap.onUserTask(workflowName, 'approver1', function testFunction(err, task, instance) {
      expect(err).to.not.exist;
      task.complete({
        __action__: 'invalidAction'
      }, bootstrap.getContext('usr3'), function testFunction(err, task) {
        expect(err).to.exist;
        expect(err.message).to.include('Provided action is not valid. Possible valid actions');
        expect(task).to.not.exist;
        done();
      });
    });

    maker2Task.complete({
      sequence: 1001
    }, bootstrap.getContext('usr2'), function testFunction(err, task) {
      expect(err).to.not.exist;
      expect(task.status).to.equal(Status.COMPLETE);
    });
  });

  it('approver1 rejects', function testFunction(done) {
    bootstrap.onComplete(workflowName, function testFunction(err, instance) {
      expect(err).to.not.exist;
      stateVerifier.isComplete(instance);
      stateVerifier.verifyTokens(instance, ['Start', 'maker2', 'approver1', 'exg1', 'FinalizeReject', 'End']);
      ChangeWorkflowRequest.find({
        workflowInstanceId: instance.workflowInstanceId
      }, bootstrap.defaultContext, function testFunction(err, changes) {
        expect(err).to.not.exist;
        expect(changes).to.be.an('array').of.length(1);
        let changeRequest = changes[0];
        expect(changeRequest._modifiers).to.exist.and.be.an('array').of.length(2);
        expect(changeRequest._modifiers).to.have.members(['usr1', 'usr2']);
        expect(changeRequest.status).to.equal(Status.COMPLETE);
        expect(changeRequest.verificationStatus).to.equal(Status.REJECTED);
        done();
      });
    });

    bootstrap.onUserTask(workflowName, 'approver1', function testFunction(err, task, instance) {
      expect(err).to.not.exist;
      task.complete({
        __action__: Status.REJECTED
      }, bootstrap.getContext('usr3'), function testFunction(err, task) {
        expect(err).to.not.exist;
        expect(task).to.exist;
        expect(task.status).to.equal(Status.COMPLETE);
      });
    });

    maker2Task.complete({
      sequence: 1001
    }, bootstrap.getContext('usr2'), function testFunction(err, task) {
      expect(err).to.not.exist;
      expect(task.status).to.equal(Status.COMPLETE);
    });
  });


  it('approver1 sends back for rework', function testFunction(done) {
    bootstrap.onUserTask(workflowName, 'maker2', function testFunction(err, task, instance) {
      expect(err).to.not.exist;
      expect(task.message).to.exist.and.have.property('text').that.equals('message to maker2');
      stateVerifier.isRunning(instance);
      stateVerifier.verifyPV(instance, {
        approver1: 'approver1'
      });
      stateVerifier.verifyTokens(instance, ['Start', 'maker2', 'approver1', 'exg1', {
        name: 'maker2',
        status: Status.PENDING
      }]);
      ChangeWorkflowRequest.find({
        workflowInstanceId: instance.workflowInstanceId
      }, bootstrap.defaultContext, function testFunction(err, changes) {
        expect(err).to.not.exist;
        expect(changes).to.be.an('array').of.length(1);
        let changeRequest = changes[0];
        expect(changeRequest._modifiers).to.exist.and.be.an('array').of.length(2);
        expect(changeRequest._modifiers).to.have.members(['usr1', 'usr2']);
        expect(changeRequest.status).to.equal(Status.PENDING);
        expect(changeRequest.verificationStatus).to.equal(Status.REWORK);
        done();
      });
    });

    bootstrap.onUserTask(workflowName, 'approver1', function testFunction(err, task, instance) {
      expect(err).to.not.exist;
      task.complete({
        __action__: Status.REWORK,
        pv: {
          approver1: 'approver1'
        },
        msg: {
          text: 'message to maker2'
        }
      }, bootstrap.getContext('usr3'), function testFunction(err, task) {
        expect(err).to.not.exist;
        expect(task).to.exist;
        expect(task.status).to.equal(Status.COMPLETE);
      });
    });

    maker2Task.complete({
      sequence: 1001
    }, bootstrap.getContext('usr2'), function testFunction(err, task) {
      expect(err).to.not.exist;
      expect(task.status).to.equal(Status.COMPLETE);
    });
  });

  it('approver1 approves', function testFunction(done) {
    bootstrap.onUserTask(workflowName, 'approver2', function testFunction(err, task, instance) {
      expect(err).to.not.exist;
      expect(task.message).to.exist.and.have.property('text').that.equals('message to approver2');
      stateVerifier.isRunning(instance);
      stateVerifier.verifyPV(instance, {
        approver1: 'approver1'
      });
      stateVerifier.verifyTokens(instance, ['Start', 'maker2', 'approver1', 'exg1', {
        name: 'approver2',
        status: Status.PENDING
      }]);
      ChangeWorkflowRequest.find({
        workflowInstanceId: instance.workflowInstanceId
      }, bootstrap.defaultContext, function testFunction(err, changes) {
        expect(err).to.not.exist;
        expect(changes).to.be.an('array').of.length(1);
        let changeRequest = changes[0];
        expect(changeRequest._modifiers).to.exist.and.be.an('array').of.length(2);
        expect(changeRequest._modifiers).to.have.members(['usr1', 'usr2']);
        expect(changeRequest.status).to.equal(Status.PENDING);
        expect(changeRequest.verificationStatus).to.equal(Status.APPROVED);
        done();
      });
    });

    bootstrap.onUserTask(workflowName, 'approver1', function testFunction(err, task, instance) {
      expect(err).to.not.exist;
      task.complete({
        __action__: Status.APPROVED,
        pv: {
          approver1: 'approver1'
        },
        msg: {
          text: 'message to approver2'
        }
      }, bootstrap.getContext('usr3'), function testFunction(err, task) {
        expect(err).to.not.exist;
        expect(task).to.exist;
        expect(task.status).to.equal(Status.COMPLETE);
      });
    });

    maker2Task.complete({
      sequence: 1001
    }, bootstrap.getContext('usr2'), function testFunction(err, task) {
      expect(err).to.not.exist;
      expect(task.status).to.equal(Status.COMPLETE);
    });
  });


  it('approver2 sends for rework', function testFunction(done) {
    bootstrap.onUserTask(workflowName, 'maker2', function testFunction(err, task, instance) {
      expect(err).to.not.exist;
      expect(task.message).to.exist.and.have.property('text').that.equals('need some rework');
      stateVerifier.isRunning(instance);
      stateVerifier.verifyPV(instance, {
        approver2: 'approver2'
      });
      stateVerifier.verifyTokens(instance, ['Start', 'maker2', 'approver1', 'exg1', 'approver2', 'exg2', {
        name: 'maker2',
        status: Status.PENDING
      }]);
      ChangeWorkflowRequest.find({
        workflowInstanceId: instance.workflowInstanceId
      }, bootstrap.defaultContext, function testFunction(err, changes) {
        expect(err).to.not.exist;
        expect(changes).to.be.an('array').of.length(1);
        let changeRequest = changes[0];
        expect(changeRequest._modifiers).to.exist.and.be.an('array').of.length(2);
        expect(changeRequest._modifiers).to.have.members(['usr1', 'usr2']);
        expect(changeRequest.status).to.equal(Status.PENDING);
        expect(changeRequest.verificationStatus).to.equal(Status.REWORK);
        done();
      });
    });


    bootstrap.onUserTask(workflowName, 'approver2', function testFunction(err, task, instance) {
      expect(err).to.not.exist;
      expect(task).to.exist;
      task.complete({
        __action__: Status.REWORK,
        pv: {
          approver2: 'approver2'
        },
        msg: {
          text: 'need some rework'
        }
      }, bootstrap.getContext('usr3'), function testFunction(err, task) {
        expect(err).to.not.exist;
        expect(task).to.exist;
        expect(task.status).to.equal(Status.COMPLETE);
      });
    });

    bootstrap.onUserTask(workflowName, 'approver1', function testFunction(err, task, instance) {
      expect(err).to.not.exist;
      task.complete({
        __action__: Status.APPROVED,
        pv: {
          approver1: 'approver1'
        },
        msg: {
          text: 'message to approver2'
        }
      }, bootstrap.getContext('usr3'), function testFunction(err, task) {
        expect(err).to.not.exist;
        expect(task).to.exist;
        expect(task.status).to.equal(Status.COMPLETE);
      });
    });

    maker2Task.complete({
      sequence: 1001
    }, bootstrap.getContext('usr2'), function testFunction(err, task) {
      expect(err).to.not.exist;
      expect(task.status).to.equal(Status.COMPLETE);
    });
  });

  it('approver2 rejects', function testFunction(done) {
    bootstrap.onComplete(workflowName, function testFunction(err, instance) {
      expect(err).to.not.exist;
      stateVerifier.isComplete(instance);
      stateVerifier.verifyPV(instance, {
        approver2: 'approver2'
      });
      stateVerifier.verifyTokens(instance, ['Start', 'maker2', 'approver1', 'exg1', 'approver2', 'exg2', 'End']);
      ChangeWorkflowRequest.find({
        workflowInstanceId: instance.workflowInstanceId
      }, bootstrap.defaultContext, function testFunction(err, changes) {
        expect(err).to.not.exist;
        expect(changes).to.be.an('array').of.length(1);
        let changeRequest = changes[0];
        expect(changeRequest._modifiers).to.exist.and.be.an('array').of.length(2);
        expect(changeRequest._modifiers).to.have.members(['usr1', 'usr2']);
        expect(changeRequest.status).to.equal(Status.COMPLETE);
        expect(changeRequest.verificationStatus).to.equal(Status.REJECTED);

        StoreV2.find({}, bootstrap.defaultContext, function testFunction(err, records) {
          expect(err).to.not.exist;
          expect(records).to.be.an('array').of.length(0);
          done();
        });
      });
    });


    bootstrap.onUserTask(workflowName, 'approver2', function testFunction(err, task, instance) {
      expect(err).to.not.exist;
      expect(task).to.exist;
      task.complete({
        __action__: Status.REJECTED,
        pv: {
          approver2: 'approver2'
        },
        msg: {
          text: 'not required'
        }
      }, bootstrap.getContext('usr3'), function testFunction(err, task) {
        expect(err).to.not.exist;
        expect(task).to.exist;
        expect(task.status).to.equal(Status.COMPLETE);
      });
    });

    bootstrap.onUserTask(workflowName, 'approver1', function testFunction(err, task, instance) {
      expect(err).to.not.exist;
      task.complete({
        __action__: Status.APPROVED,
        pv: {
          approver1: 'approver1'
        },
        msg: {
          text: 'message to approver2'
        }
      }, bootstrap.getContext('usr3'), function testFunction(err, task) {
        expect(err).to.not.exist;
        expect(task).to.exist;
        expect(task.status).to.equal(Status.COMPLETE);
      });
    });

    maker2Task.complete({
      sequence: 1001
    }, bootstrap.getContext('usr2'), function testFunction(err, task) {
      expect(err).to.not.exist;
      expect(task.status).to.equal(Status.COMPLETE);
    });
  });

  it('approver2 approves', function testFunction(done) {
    bootstrap.onComplete(workflowName, function testFunction(err, instance) {
      expect(err).to.not.exist;
      stateVerifier.isComplete(instance);
      stateVerifier.verifyPV(instance, {
        approver2: 'approver2'
      });
      stateVerifier.verifyTokens(instance, ['Start', 'maker2', 'approver1', 'exg1', 'approver2', 'exg2', 'End']);
      ChangeWorkflowRequest.find({
        workflowInstanceId: instance.workflowInstanceId
      }, bootstrap.defaultContext, function testFunction(err, changes) {
        expect(err).to.not.exist;
        expect(changes).to.be.an('array').of.length(1);
        let changeRequest = changes[0];
        expect(changeRequest._modifiers).to.exist.and.be.an('array').of.length(2);
        expect(changeRequest._modifiers).to.have.members(['usr1', 'usr2']);
        expect(changeRequest.status).to.equal(Status.COMPLETE);
        expect(changeRequest.verificationStatus).to.equal(Status.APPROVED);

        StoreV2.find({}, bootstrap.defaultContext, function testFunction(err, records) {
          expect(err).to.not.exist;
          expect(records).to.be.an('array').of.length(1);
          done();
        });
      });
    });


    bootstrap.onUserTask(workflowName, 'approver2', function testFunction(err, task, instance) {
      expect(err).to.not.exist;
      expect(task).to.exist;
      task.complete({
        __action__: Status.APPROVED,
        pv: {
          approver2: 'approver2'
        },
        msg: {
          text: 'found ok'
        }
      }, bootstrap.getContext('usr3'), function testFunction(err, task) {
        expect(err).to.not.exist;
        expect(task).to.exist;
        expect(task.status).to.equal(Status.COMPLETE);
      });
    });

    bootstrap.onUserTask(workflowName, 'approver1', function testFunction(err, task, instance) {
      expect(err).to.not.exist;
      task.complete({
        __action__: Status.APPROVED,
        pv: {
          approver1: 'approver1',
          _updates: {
            set: {owner: 'Johny'},
            unset: {comments: true}
          }
        },
        msg: {
          text: 'message to approver2'
        }
      }, bootstrap.getContext('usr3'), function testFunction(err, task) {
        expect(err).to.not.exist;
        expect(task).to.exist;
        expect(task.status).to.equal(Status.COMPLETE);
      });
    });

    maker2Task.complete({
      sequence: 1002,
      comments: 'store comment'
    }, bootstrap.getContext('usr2'), function testFunction(err, task) {
      expect(err).to.not.exist;
      expect(task.status).to.equal(Status.COMPLETE);
    });
  });
});
