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
  let workflowName = 'signal-intra-process-start';
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

  afterEach('reset', function testFunction() {
    workflowInstance = null;
    bootstrap.removeTokenStatusListener(workflowName);
    bootstrap.removeCompleteListener(workflowName);
  });

  it('Start-Catch Waits and Resumes when Throw Sends the signal', function CB(done) {
    expect(workflowInstance).to.exist;
    let execOrder = 0;
    /* (Potential Testing issue) When Wait400 is Pending, CatchSignal may not have been created. */
    bootstrap.onTokenStatus(workflowName, 'Wait400', 'pending', function testFunction(err, instance, token) {
      expect(++execOrder).to.equal(1);
      expect(err).to.not.exist;
      expect(instance).to.exist;
      stateVerifier.isRunning(instance);
      stateVerifier.verifyTokens(instance, ['Start', 'Fork', {
        name: 'Wait400',
        status: Status.PENDING
      }, {
        name: 'Sub',
        status: Status.PENDING
      }]);
    });

    bootstrap.onTokenStatus(workflowName, 'Wait400', 'complete', function testFunction(err, instance, token) {
      expect(++execOrder).to.equal(2);
      expect(err).to.not.exist;
      expect(instance).to.exist;
      stateVerifier.isRunning(instance);
      instance.subProcesses({}, bootstrap.defaultContext, function testFunction(err, subProcesses) {
        expect(err).to.not.exist;
        expect(subProcesses).to.exist.and.be.an('array').of.length(1);
        stateVerifier.verifyTokens(subProcesses[0], [{
          name: 'CatchSignal',
          status: Status.PENDING
        }]);
      });
    });

    bootstrap.onComplete(workflowName, function testFunction(err, instance) {
      expect(++execOrder).to.equal(3);
      expect(err).to.not.exist;
      expect(instance).to.exist;
      stateVerifier.isComplete(instance);
      stateVerifier.verifyTokens(instance, ['Start', 'Fork', 'Wait400', 'Sub', 'ThrowSignal', 'End'], true);
      done();
    });
  });
});
