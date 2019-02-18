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

describe('Parallel Gateway Tests', function CB() {
  let workflowName = 'parallel-gateway';
  let processInstance;
  before('define workflow', function testFunction(done) {
    bootstrap.onComplete(workflowName, function testFunction(err, procInstance) {
      expect(err).to.not.exist;
      processInstance = procInstance;
      done();
    });
    bootstrap.loadAndTrigger(workflowName, {}, function testFunction(err, wfDefn, wfInstance) {
      expect(err).to.not.exist;
    });
  });
  after('cleanup data', function testFunction(done) {
    bootstrap.removeCompleteListener(workflowName);
    bootstrap.cleanUp(workflowName, done);
  });

  it('Parallel Gateway spawns parallel tokens and ends together before resuming next node', function testFunction(done) {
    expect(processInstance).to.exist;
    stateVerifier.isComplete(processInstance);
    /* In a parallel-gateway, there are multiple converting tokens created.
     * Each starts when corresponding branch completes. They all end together
     * and Next node starts after that.
     * So we can not say all PGOuts would start after all scripts complete */
    stateVerifier.verifyFlowNew(processInstance, ['Start', 'PGIn', ['Script01', 'Script02', 'Script03', 'Script04', 'Script05'], 'End']);
    stateVerifier.verifyPV(processInstance, {
      script01: 'done',
      script02: 'done',
      script03: 'done',
      script04: 'done',
      script05: 'done'
    });
    done();
  });
});
