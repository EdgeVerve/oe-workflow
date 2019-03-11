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

describe('Terminate Event Tests', function CB() {
  let workflowName = 'terminate-end-event';
  before('define workflow', function testFunction(done) {
    bootstrap.loadBpmnFile(workflowName, function testFunction(err) {
      done(err);
    });
  });
  after('cleanup data', function testFunction(done) {
    bootstrap.cleanUp(workflowName, done);
  });

  let workflowInstance;

  beforeEach(function testFunction(done) {
    bootstrap.triggerWorkflow(workflowName, {}, function testFunction(err, wfInstance) {
      expect(err).to.not.exist;
      expect(wfInstance).to.exist;
      workflowInstance = wfInstance;
      done();
    });
  });
  afterEach(function testFunction(done) {
    workflowInstance = null;
    bootstrap.removeUserTaskListener(workflowName, 'UserTask2');
    bootstrap.removeCompleteListener(workflowName);
    bootstrap.removeInterruptedListener(workflowName + '$Sub');
    done();
  });
  it('TerminateEnd Event terminates entire workflow', function testFunction(done) {
    expect(workflowInstance).to.exist;
    bootstrap.onUserTask(workflowName, 'UserTask2', function testFunction(err, task, processInstance) {
      expect(err).to.not.exist;
      task.complete({}, bootstrap.defaultContext, function testFunction(err, task) {
        expect(err).to.not.exist;
        expect(task).to.exist.and.have.property('status').that.equals(Status.COMPLETE);
      });
    });
    async.parallel([
      function mainTerminate(callback) {
        bootstrap.onComplete(workflowName, function testFunction(err, processInstance) {
          expect(err).to.not.exist;
          stateVerifier.isComplete(processInstance);
          stateVerifier.verifyTokens(processInstance, ['Start', 'PGway', 'UserTask2', 'ForceEnd', {
            name: 'UserTask1',
            status: Status.INTERRUPTED
          }, {
            name: 'Sub',
            status: Status.INTERRUPTED
          }]);
          callback(err, true);
        });
      },
      function subTerminate(callback) {
        bootstrap.onInterrupted(workflowName + '$Sub', function testFunction(err, processInstance) {
          expect(err).to.not.exist;
          stateVerifier.isInterrupted(processInstance);
          stateVerifier.verifyTokens(processInstance, ['SubStart', {
            name: 'UserTaskSub',
            status: Status.INTERRUPTED
          }]);
          callback(err, true);
        });
      }
    ], function testFunction(err, results) {
      expect(err).to.not.exist;
      done(err);
    });
  });
});
