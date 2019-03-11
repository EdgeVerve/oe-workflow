/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
let async = require('async');
let bootstrap = require('../bootstrap.js');
let chai = bootstrap.chai;
let expect = chai.expect;
let Status = bootstrap.Status;
let stateVerifier = require('../utils/state-verifier');

describe('Signal Event Boundary Non-Interrupting Tests', function CB() {
  let workflowName = 'signal-boundary-non-interrupting';
  before('define workflow', function testFunction(done) {
    bootstrap.loadBpmnFile(workflowName, function testFunction(err) {
      done(err);
    });
  });
  after('cleanup data', function testFunction(done) {
    bootstrap.cleanUp(workflowName, done);
  });

  let userTaskThrow;
  let userTaskCatch;
  beforeEach(function testFunction(done) {
    bootstrap.triggerWorkflow(workflowName, {}, function testFunction(err, wfInstance) {
      expect(err).to.not.exist;
      expect(wfInstance).to.exist;
    });

    async.parallel([
      function testFunction(callback) {
        bootstrap.onUserTask(workflowName, 'UserTaskThrow', function testFunction(err, task, instance) {
          expect(err).to.not.exist;
          userTaskThrow = task;
          callback();
        });
      },
      function testFunction(callback) {
        bootstrap.onUserTask(workflowName, 'UserTaskCatch', function testFunction(err, task, instance) {
          expect(err).to.not.exist;
          userTaskCatch = task;
          callback();
        });
      }
    ], function testFunction(err, results) {
      done(err);
    });
  });
  afterEach(function testFunction(done) {
    userTaskCatch = null;
    userTaskThrow = null;
    bootstrap.removeCompleteListener(workflowName);
    bootstrap.removeUserTaskListener(workflowName, 'UserTaskThrow');
    bootstrap.removeUserTaskListener(workflowName, 'UserTaskCatch');
    done();
  });

  it('Throw triggers  Signal-Catch but does not interrupt Boundary task', function testFunction(done) {
    expect(userTaskCatch).to.exist;
    expect(userTaskThrow).to.exist;

    userTaskThrow.complete({}, bootstrap.defaultContext, function testFunction(err, task) {
      expect(err).to.not.exist;
      expect(task.status).to.equal(Status.COMPLETE);
      /* Let this throw signal and trigger End3 Complete */
    });
    bootstrap.onTokenStatus(workflowName, 'End3', Status.COMPLETE, function testFunction(err, instance, token) {
      expect(err).to.not.exist;
      /* Signal-Catch path completed, Process should still be running and waiting on uninterrupted Catch-UserTask */
      expect(token.status).to.equal(Status.COMPLETE);
      stateVerifier.isRunning(instance);
      let userTaskCatchToken = stateVerifier.fetchTokenByName(instance, 'UserTaskCatch');
      expect(userTaskCatchToken).to.exist.and.have.property('status').that.equals(Status.PENDING);
      userTaskCatch.complete({}, bootstrap.defaultContext, function testFunction(err, task) {
        expect(err).to.not.exist;
        expect(task.status).to.equal(Status.COMPLETE);
        /* Let this complete the flow */
      });
    });
    bootstrap.onComplete(workflowName, function testFunction(err, processInstance) {
      expect(err).to.not.exist;
      stateVerifier.isComplete(processInstance);
      stateVerifier.verifyTokens(processInstance, ['Start', 'PGway', 'UserTaskThrow', 'SignalThrow', 'End1', 'SignalCatch', 'TaskC', 'End3', 'UserTaskCatch', 'End2']);
      done();
    });
  });

  it('If task is completed, boundary non-interrupting catch token is not created and ignored', function testFunction(done) {
    expect(userTaskCatch).to.exist;
    expect(userTaskThrow).to.exist;

    bootstrap.onComplete(workflowName, function testFunction(err, processInstance) {
      expect(err).to.not.exist;
      stateVerifier.isComplete(processInstance);
      stateVerifier.verifyTokens(processInstance, ['Start', 'PGway', 'UserTaskThrow', 'SignalThrow', 'End1', 'UserTaskCatch', {
        name: 'SignalCatch',
        status: Status.INTERRUPTED
      }, 'End2']);
      done();
    });

    async.series([
      function testFunction(callback) {
        userTaskCatch.complete({}, bootstrap.defaultContext, function testFunction(err, task) {
          expect(err).to.not.exist;
          expect(task.status).to.equal(Status.COMPLETE);
          callback();
        });
      },
      function testFunction(callback) {
        userTaskThrow.complete({}, bootstrap.defaultContext, function testFunction(err, task) {
          expect(err).to.not.exist;
          expect(task.status).to.equal(Status.COMPLETE);
          callback();
        });
      }
    ], function testFunction(err, results) {
      expect(err).to.not.exist;
    });
  });
});
