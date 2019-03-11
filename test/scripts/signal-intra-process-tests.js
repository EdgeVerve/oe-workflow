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

describe('Intra-Process Signal Tests', function CB() {
  let workflowName = 'signal-intra-process';
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

  beforeEach('trigger and complete workflow', function testFunction(done) {
    bootstrap.triggerWorkflow(workflowName, workflowPayload, function testFunction(err, wfInstance) {
      workflowInstance = wfInstance;
      done(err);
    });
  });

  this.afterEach('reset', function testFunction() {
    workflowInstance = null;
    bootstrap.removeTokenStatusListener(workflowName);
    bootstrap.removeCompleteListener(workflowName);
  });
  it('CatchSignal Waits and Resumes when Throw Sends the signal', function CB(done) {
    expect(workflowInstance).to.exist;

    /* (Potential Testing issue) When Timer200 is Pending, CatchSignal may not have been created. */
    bootstrap.onTokenStatus(workflowName, 'Timer200', 'pending', function testFunction(err, instance, token) {
      expect(err).to.not.exist;
      expect(instance).to.exist;
      stateVerifier.isRunning(instance);
      stateVerifier.verifyTokens(instance, ['Start', 'Fork', {
        name: 'Timer200',
        status: Status.PENDING
      }, {
        name: 'CatchSignal',
        status: Status.PENDING
      }], true);
      done();
    });

    bootstrap.onComplete(workflowName, function testFunction(err, instance) {
      expect(err).to.not.exist;
      expect(instance).to.exist;
      stateVerifier.isComplete(instance);
      stateVerifier.verifyTokens(instance, ['Start', 'Fork', 'Timer200', 'CatchSignal', 'ThrowSignal', 'End'], true);
      done();
    });
  });
});
