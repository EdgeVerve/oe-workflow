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

describe('Intra-Process Boundary Signal Tests', function CB() {
  let workflowName = 'signal-intra-process-boundary';
  before('define workflow', function testFunction(done) {
    bootstrap.loadBpmnFile(workflowName, function testFunction(err) {
      done(err);
    });
  });
  after('cleanup data', function testFunction(done) {
    bootstrap.cleanUp(workflowName, done);
  });

  let workflowInstance;
  let workflowPayload = {};

  beforeEach('trigger the workflow', function testFunction(done) {
    bootstrap.triggerWorkflow(workflowName, workflowPayload, function testFunction(err, wfInstance) {
      workflowInstance = wfInstance;
      done(err);
    });
  });

  afterEach('reset', function testFunction(done) {
    workflowInstance = null;
    bootstrap.removeTokenStatusListener(workflowName);
    bootstrap.removeUserTaskListener(workflowName, 'UserTask');
    done();
  });

  it('Boundary catch interrupts the token', function CB(done) {
    expect(workflowInstance).to.exist;
    bootstrap.onComplete(workflowName, function testFunction(err, instance) {
      expect(err).to.not.exist;
      expect(instance).to.exist;
      stateVerifier.isComplete(instance);
      stateVerifier.verifyTokens(instance, ['Start', 'Fork', 'Wait400', 'ThrowSignal', 'End', {name: 'UserTask', status: Status.INTERRUPTED}, 'CatchSignal', 'AutoEnd']);
      expect(stateVerifier.fetchTokenByName(instance, 'UserEnd')).to.not.exist;
      done();
    });
  });


  it('When boundary host has completed, catch-signal is interrupted', function CB(done) {
    expect(workflowInstance).to.exist;

    /* (Potential Testing issue) By the time we reach here testing, Wait400 may have elapsed and raised interrupt to user-task */
    bootstrap.onUserTask(workflowName, 'UserTask', function testFunction(err, task) {
      expect(err).to.not.exist;
      task.complete({}, bootstrap.defaultContext, function testFunction(err, task) {
        expect(err).to.not.exist;
        expect(task.status).to.equal(Status.COMPLETE);
      });
    });

    bootstrap.onComplete(workflowName, function testFunction(err, instance) {
      expect(err).to.not.exist;
      expect(instance).to.exist;
      stateVerifier.isComplete(instance);
      stateVerifier.verifyTokens(instance, ['Start', 'Fork', 'Wait400', 'ThrowSignal', 'End', 'UserTask', {name: 'CatchSignal', status: Status.INTERRUPTED}, 'UserEnd']);
      done();
    });
  });
});
