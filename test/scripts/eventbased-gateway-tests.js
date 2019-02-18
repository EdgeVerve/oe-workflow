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
let Status = bootstrap.Status;

describe('EventBased Gateway Tests', function CB() {
  let workflowName = 'eventbased-gateway';
  let processInstance;
  before('define workflow', function testFunction(done) {
    /* Observed with Oracle sometimes that Upload and Execution takes around 50 seconds */
    this.timeout(60000);
    bootstrap.loadAndTrigger(workflowName, {}, function testFunction(err, wfDefn, wfInst) {
      expect(err).to.not.exist;
      expect(wfInst).to.exist;
    });
    bootstrap.onComplete(workflowName, function testFunction(err, procInst) {
      expect(err).to.not.exist;
      expect(procInst).to.exist;
      processInstance = procInst;
      done();
    });
  });
  after('cleanup data', function testFunction(done) {
    bootstrap.removeCompleteListener(workflowName);
    bootstrap.cleanUp(workflowName, done);
  });

  it('Verify the flow', function testFunction(done) {
    stateVerifier.isComplete(processInstance);
    stateVerifier.verifyTokens(processInstance, ['Start', 'PGFork', 'Timer1', 'MThrow', 'EBG1', 'MCatch', {
      name: 'Timer2',
      status: Status.INTERRUPTED
    }, {
      name: 'Signal1',
      status: Status.INTERRUPTED
    }, 'EventSync', 'PGSync', 'PGSync', 'End']);
    done();
  });
});
