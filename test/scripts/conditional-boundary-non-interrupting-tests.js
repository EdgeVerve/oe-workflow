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

describe('Conditional Event Boundary Non-Interrupting Tests', function CB() {
  let workflowName = 'conditional-boundary-non-interrupting';
  before('define workflow', function testFunction(done) {
    bootstrap.loadBpmnFile(workflowName, function testFunction(err) {
      done(err);
    });
  });
  after('cleanup data', function testFunction(done) {
    bootstrap.cleanUp(workflowName, done);
  });

  let test1;
  let test2;
  beforeEach(function testFunction(done) {
    bootstrap.triggerWorkflow(workflowName, {}, function testFunction(err, wfInstance) {
      expect(err).to.not.exist;
      expect(wfInstance).to.exist;
    });

    async.parallel([
      function testFunction(callback) {
        bootstrap.onUserTask(workflowName, 'Test1', function testFunction(err, task, instance) {
          expect(err).to.not.exist;
          test1 = task;
          callback();
        });
      },
      function testFunction(callback) {
        bootstrap.onUserTask(workflowName, 'Test2', function testFunction(err, task, instance) {
          expect(err).to.not.exist;
          test2 = task;
          callback();
        });
      }
    ], function testFunction(err, results) {
      done(err);
    });
  });
  afterEach(function testFunction(done) {
    test1 = null;
    test2 = null;
    bootstrap.removeCompleteListener(workflowName);
    bootstrap.removeTokenStatusListener(workflowName);
    bootstrap.removeUserTaskListener(workflowName, 'Test1');
    bootstrap.removeUserTaskListener(workflowName, 'Test2');
    done();
  });

  it('when the condition of Conditional Boundary (non-interrupting) satisfies, it creates a new path without interrupting Task2', function testFunction(done) {
    expect(test1).to.exist;
    expect(test2).to.exist;

    bootstrap.onTokenStatus(workflowName, 'End3', Status.COMPLETE, function testFunction(err, instance, token) {
        expect(err).to.not.exist;
        /* Conditional-Boundary path completed, Process should still be running and waiting on Test2 Task */
        expect(token.status).to.equal(Status.COMPLETE);
        stateVerifier.isRunning(instance);
        let test2Token = stateVerifier.fetchTokenByName(instance, 'Test2');
        expect(test2Token).to.exist.and.have.property('status').that.equals(Status.PENDING);
        
        /* Making sure we complete test2 task after End3 (and hence after conditional boundary is completed) */
        test2.complete({}, bootstrap.defaultContext, function testFunction(err, task) {
            expect(err).to.not.exist;
            expect(task.status).to.equal(Status.COMPLETE);
        });
    });
    
    /* Complete the Test1 Task so that ConditionalBoundary triggers */
    test1.complete({}, bootstrap.defaultContext, function testFunction(err, task) {
        expect(err).to.not.exist;
        expect(task.status).to.equal(Status.COMPLETE);
    });

    bootstrap.onComplete(workflowName, function testFunction(err, processInstance) {
      expect(err).to.not.exist;
      stateVerifier.isComplete(processInstance);
      expect(processInstance._processVariables.test2).to.exist;
      expect(processInstance._processVariables.test2).to.equals('done');
      stateVerifier.verifyTokens(processInstance, ['Start', 'PGway', 'Test1', 'Script', 'End1', 'ConditionalBoundary', 'ConditionalScript', 'End3', 'Test2', 'End2']);
      done();
    });
});

  it('If Test2 Task is completed before the Conditional Boundary, Conditional Boundary gets Interrupted', function testFunction(done) {
    expect(test1).to.exist;
    expect(test2).to.exist;

    bootstrap.onComplete(workflowName, function testFunction(err, processInstance) {
      expect(err).to.not.exist;
      stateVerifier.isComplete(processInstance);
      stateVerifier.verifyTokens(processInstance, ['Start', 'PGway', 'Test1', 'Script', 'End1', 'Test2', {
        name: 'ConditionalBoundary',
        status: Status.INTERRUPTED
      }, 'End2']);
      done();
    });

    async.series([
      function testFunction(callback) {
        test2.complete({}, bootstrap.defaultContext, function testFunction(err, task) {
          expect(err).to.not.exist;
          expect(task.status).to.equal(Status.COMPLETE);
          callback();
        });
      },
      function testFunction(callback) {
        test1.complete({}, bootstrap.defaultContext, function testFunction(err, task) {
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
