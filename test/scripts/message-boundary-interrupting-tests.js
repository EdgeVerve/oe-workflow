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

describe('Message Event Boundary Interrupting Tests', function CB() {
  let workflowName = 'message-boundary-interrupting';
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
    done();
  });
  it('Throw interrupts the Catch Boundary task', function testFunction(done) {
    expect(userTaskThrow).to.exist;
    userTaskThrow.complete({}, bootstrap.defaultContext, function testFunction(err, task) {
      expect(err).to.not.exist;
      expect(task).to.exist.and.have.property('status').that.equals(Status.COMPLETE);
    });
    bootstrap.onComplete(workflowName, function testFunction(err, instance) {
      expect(err).to.not.exist;
      expect(instance).to.exist;
      stateVerifier.isComplete(instance);
      stateVerifier.verifyTokens(instance, ['Start', 'PGway', 'UserTaskThrow', 'MessageThrow', 'End1', {
        name: 'UserTaskCatch',
        status: Status.INTERRUPTED
      }, 'MessageCatch', 'TaskC', 'End3']);
      done();
    });
  });


  it('If task is completed, boundary catch does nothing', function testFunction(done) {
    expect(userTaskCatch).to.exist;
    expect(userTaskThrow).to.exist;

    bootstrap.onComplete(workflowName, function testFunction(err, processInstance) {
      expect(err).to.not.exist;
      stateVerifier.isComplete(processInstance);
      stateVerifier.verifyTokens(processInstance, ['Start', 'PGway', 'UserTaskThrow', 'MessageThrow', 'End1', 'UserTaskCatch', {
        name: 'MessageCatch',
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
