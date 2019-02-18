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

let stateVerifier = require('../utils/state-verifier');

describe('Boundary Timer Tests', function CB() {
  let workflowName = 'timer-boundary';
  before('define workflow', function testFunction(done) {
    bootstrap.loadBpmnFile(workflowName, function testFunction(err) {
      expect(err).to.not.exist;
      done(err);
    });
  });
  after('cleanup data', function testFunction(done) {
    bootstrap.cleanUp(workflowName, done);
  });

  afterEach('remove listeners', function testFunction(done) {
    bootstrap.removeCompleteListener(workflowName);
    bootstrap.removeUserTaskListener(workflowName, 'UserTask');
    done();
  });

  it('Boundary Timer node interrupts the task and resumes the workflow', function testFunction(done) {
    bootstrap.triggerAndComplete(workflowName, {}, function testFunction(err, wfInstance, procInstance) {
      expect(err).to.not.exist;
      stateVerifier.isComplete(procInstance);
      stateVerifier.verifyTokens(procInstance, [{
        name: 'Start',
        status: Status.COMPLETE
      }, {
        name: 'UserTask',
        status: Status.INTERRUPTED
      }, {
        name: 'BoundaryTimer',
        status: Status.COMPLETE
      }, {
        name: 'TaskB',
        status: Status.COMPLETE
      }, {
        name: 'End2',
        status: Status.COMPLETE
      }]);

      stateVerifier.verifyTimerCompletion(procInstance, 'BoundaryTimer', 600);
      done();
    });
  });

  it('Boundary Timer is interrupted when boundary-task is completed', function testFunction(done) {
    bootstrap.onComplete(workflowName, function testFunction(err, procInstance) {
      expect(err).to.not.exist;
      stateVerifier.isComplete(procInstance);
      stateVerifier.verifyTokens(procInstance, [{
        name: 'Start',
        status: Status.COMPLETE
      }, {
        name: 'UserTask',
        status: Status.COMPLETE
      }, {
        name: 'BoundaryTimer',
        status: Status.INTERRUPTED
      }, {
        name: 'End1',
        status: Status.COMPLETE
      }]);
      done();
    });
    bootstrap.triggerWaitForUserTask(workflowName, {}, 'UserTask', function testFunction(err, wfInstance, procInstance, userTask) {
      expect(err).to.not.exist;
      expect(wfInstance).to.exist;
      expect(userTask).to.exist;
      userTask.complete({}, bootstrap.defaultContext, function testFunction(err, userTask) {
        expect(err).to.not.exist;
        expect(userTask.status).to.equal(Status.COMPLETE);
      });
    });
  });
});
