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

describe('Parallel Intermediate Timer Tests', function CB() {
  let workflowName = 'timer-intermediate-parallel';
  before('define workflow', function testFunction(done) {
    bootstrap.loadBpmnFile(workflowName, function testFunction(err) {
      done(err);
    });
  });
  after('cleanup data', function testFunction(done) {
    bootstrap.removeCompleteListener(workflowName);
    bootstrap.cleanUp(workflowName, done);
  });

  it('Parallel Intermediate Timers complete and resumes the workflow', function testFunction(done) {
    bootstrap.triggerAndComplete(workflowName, {}, function testFunction(err, wfInstance, procInstance) {
      expect(err).to.not.exist;
      stateVerifier.isComplete(procInstance);
      // var expectedFlow = ['Start', 'PG1', 'ITimer1', 'ITimer2', 'PG2', 'PG2', 'End'];
      stateVerifier.verifyTimerCompletion(procInstance, 'ITimer1', 200);
      stateVerifier.verifyTimerCompletion(procInstance, 'ITimer2', 800);
      // stateVerifier.verifyCompletionFlow(procInstance, expectedFlow);
      done();
    });
  });
});
