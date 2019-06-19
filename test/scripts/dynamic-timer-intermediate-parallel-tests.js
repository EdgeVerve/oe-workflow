/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

let bootstrap = require('../bootstrap.js');
let chai = bootstrap.chai;
let expect = chai.expect;

let stateVerifier = require('../utils/state-verifier');

describe('Parallel IntermediateTimer Tests for Dynamic and Default Timers', function CB() {
  let workflowName = 'dynamic-timer-intermediate-parallel';

  before('define workflow', function testFunction(done) {
    bootstrap.loadBpmnFile(workflowName, function testFunction(err) {
      done(err);
    });
  });

  after('cleanup data', function testFunction(done) {
    bootstrap.removeCompleteListener(workflowName);
    bootstrap.cleanUp(workflowName, done);
  });

  describe('DynamicTimer - Parallel IntermediateTimer Tests', function CB() {
    let workflowPayload = {
      processVariables: {
        tduration1: 200,
        tduration2: 400
      }
    };

    it('DynamicTimer - Parallel IntermediateTimer complete and resumes the workflow', function testFunction(done) {
      bootstrap.triggerAndComplete(workflowName, workflowPayload, function testFunction(err, wfInstance, procInstance) {
        expect(err).to.not.exist;
        stateVerifier.isComplete(procInstance);
        var expectedFlow = ['Start', 'PG1', 'ITimer1', 'ITimer2', 'PG2', 'PG2', 'End'];
        stateVerifier.verifyTimerCompletion(procInstance, 'ITimer1', 200);
        stateVerifier.verifyTimerCompletion(procInstance, 'ITimer2', 400);
        stateVerifier.verifyCompletionFlow(procInstance, expectedFlow);
        done();
      });
    });
  });

  describe('DefaultTimer - Parallel IntermediateTimer Tests', function CB() {
    let workflowPayload = {
      processVariables: {
        tduration1: 'abc',
        tduration2: 'xyz'
      }
    };

    it('DefaultTimer - Parallel IntermediateTimer complete and resumes the workflow', function testFunction(done) {
      bootstrap.triggerAndComplete(workflowName, workflowPayload, function testFunction(err, wfInstance, procInstance) {
        expect(err).to.not.exist;
        stateVerifier.isComplete(procInstance);
        var expectedFlow = ['Start', 'PG1', 'ITimer2', 'ITimer1', 'PG2', 'PG2', 'End'];
        stateVerifier.verifyTimerCompletion(procInstance, 'ITimer1', 0);
        stateVerifier.verifyTimerCompletion(procInstance, 'ITimer2', 0);
        stateVerifier.verifyCompletionFlow(procInstance, expectedFlow);
        done();
      });
    });
  });
});
