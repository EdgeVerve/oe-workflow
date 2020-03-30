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

describe('Conditional Event Boundary Interrupting Tests', function CB() {
  let workflowName = 'conditional-boundary-interrupting';
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

  it('Conditional Boundary interrupts the Test2 Task when the condition (pv.condition === true) is met', function testFunction(done) {
    expect(test1).to.exist;
    test1.complete({}, bootstrap.defaultContext, function testFunction(err, task) {
      expect(err).to.not.exist;
      expect(task).to.exist.and.have.property('status').that.equals(Status.COMPLETE);
    });
    bootstrap.onComplete(workflowName, function testFunction(err, instance) {
      expect(err).to.not.exist;
      expect(instance).to.exist;
      expect(instance._processVariables.condition).to.exist;
      expect(instance._processVariables.condition).to.equals(true);
      expect(instance._processVariables.condition).to.exist;
      expect(instance._processVariables.test2).to.equals('skipped');
      stateVerifier.isComplete(instance);
      stateVerifier.verifyTokens(instance, ['Start', 'PGway', 'Test1', 'Script', 'End1', {
        name: 'Test2',
        status: Status.INTERRUPTED
      }, 'ConditionalBoundary', 'ConditionalScript', 'End3']);
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

