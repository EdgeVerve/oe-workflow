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

describe('Intra-Process Signal Tests', function testFunction() {
  let workflowNameCatch = 'signal-inter-process-catch';
  let workflowNameThrow = 'signal-inter-process-throw';
  let workflowInstanceCatch;
  let userTask;
  let payloadCatch = {
    workflowDefinitionName: workflowNameCatch,
    processVariables: {
      catchcode: 101
    }
  };
  let payloadThrow = {
    workflowDefinitionName: workflowNameThrow,
    processVariables: {
      throwcode: 101
    }
  };

  before('define workflows', function testFunction(done) {
    bootstrap.loadAndTrigger(workflowNameCatch, payloadCatch, function testFunction(err1, wfDefn, wfInstance) {
      expect(err1).to.not.exist;
      workflowInstanceCatch = wfInstance;
      bootstrap.loadAndTrigger(workflowNameThrow, payloadThrow, function testFunction(err2, wfDefn, wfInstance) {
        expect(err2).to.not.exist;
      });
    });
    bootstrap.onUserTask(workflowNameThrow, 'UserTask', function testFunction(err, task) {
      expect(err).to.not.exist;
      expect(task).to.exist;
      userTask = task;
      done();
    });
  });
  after('cleanup data', function testFunction(done) {
    workflowInstanceCatch = null;
    bootstrap.cleanUp(workflowNameCatch, function testFunction(err1) {
      bootstrap.cleanUp(workflowNameThrow, function testFunction(err2) {
        done(err1 || err2);
      });
    });
    bootstrap.removeUserTaskListener(workflowNameThrow, 'UserTask');
    bootstrap.removeCompleteListener(workflowNameCatch);
    bootstrap.removeCompleteListener(workflowNameThrow);
  });

  it('CatchSignal Waits for the signal to be sent', function CB(done) {
    expect(workflowInstanceCatch).to.exist;
    workflowInstanceCatch.processes({}, bootstrap.defaultContext, function testFunction(err, processes) {
      expect(err).to.not.exist;
      expect(processes).to.exist.and.be.an('array').of.length(1);
      stateVerifier.verifyTokens(processes[0], ['Start', {
        name: 'Catch Signal',
        status: Status.PENDING
      }]);
      done();
    });
  });

  it('Throw sends the signal across to another process, catch receives and completes the flow', function CB(done) {
    expect(userTask).to.exist;
    userTask.complete({}, bootstrap.defaultContext, function testFunction(err, task) {
      expect(err).to.not.exist;
      expect(task).to.exist;
      expect(task.status).to.equal(Status.COMPLETE);
    });
    bootstrap.onComplete(workflowNameCatch, function testFunction(err, instance) {
      expect(err).to.not.exist;
      expect(instance).to.exist;
      stateVerifier.isComplete(instance);
      stateVerifier.verifyTokens(instance, ['Start', 'Catch Signal', 'End']);
      done();
    });
  });
});
