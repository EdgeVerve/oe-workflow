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

describe('Intermediate Timer Tests', function CB() {
  let workflowName = 'timer-intermediate';
  before('define workflow', function testFunction(done) {
    bootstrap.loadBpmnFile(workflowName, function testFunction(err) {
      done(err);
    });
  });
  after('cleanup data', function testFunction(done) {
    bootstrap.removeCompleteListener(workflowName);
    bootstrap.cleanUp(workflowName, done);
  });

  it('Intermediate Timer node completes and resumes the workflow', function testFunction(done) {
    bootstrap.triggerAndComplete(workflowName, {}, function testFunction(err, wfInstance, procInstance) {
      expect(err).to.not.exist;
      stateVerifier.isComplete(procInstance);
      stateVerifier.verifyTokens(procInstance, [{
        name: 'Start',
        status: Status.COMPLETE
      }, {
        name: 'TaskA',
        status: Status.COMPLETE
      }, {
        name: 'ITimer',
        status: Status.COMPLETE
      }, {
        name: 'TaskB',
        status: Status.COMPLETE
      }, {
        name: 'End',
        status: Status.COMPLETE
      }]);
      stateVerifier.verifyTimerCompletion(procInstance, 'ITimer', 600, 200);
      done();
    });
  });
});
