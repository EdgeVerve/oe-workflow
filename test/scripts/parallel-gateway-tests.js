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
  let initialMessage = {status: 'started'};
  before('define workflow', function testFunction(done) {
    bootstrap.onComplete(workflowName, function testFunction(err, procInstance) {
      expect(err).to.not.exist;
      processInstance = procInstance;
      done();
    });
    bootstrap.loadAndTrigger(workflowName, {message: initialMessage}, function testFunction(err, wfDefn, wfInstance) {
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
    stateVerifier.verifyFlowNew(processInstance, ['Start', 'PGIn', ['Script01', 'Script02', 'Script03', 'Script04', 'Script05'], 'Checks', 'End']);
    stateVerifier.verifyPV(processInstance, {
      script01: 'done',
      script02: 'done',
      script03: 'done',
      script04: 'done',
      script05: 'done'
    });
    done();
  });

  it('Parallel Gateway passes message verbatim to all spawned children', function testFunction(done) {
    expect(processInstance).to.exist;
    for (let i = 1; i <= 5; i++) {
      let scriptToken = stateVerifier.fetchTokenByName(processInstance, 'Script0' + i);
      expect(scriptToken).to.exist;
      expect(scriptToken.message).to.deep.equal(initialMessage);
    }
    done();
  });

  it('Converging parallem-gateway merges message passed from each branch and passes onto the next node', function testFunction(done) {
    expect(processInstance).to.exist;
    let checksToken = stateVerifier.fetchTokenByName(processInstance, 'Checks');
    expect(checksToken.message).to.exist;
    expect(checksToken.message).to.have.keys(['Script01', 'Script03', 'Script05']);
    expect(checksToken.message.Script01).to.deep.equal({status: 100});
    expect(checksToken.message.Script03).to.deep.equal({status: 300});
    expect(checksToken.message.Script05).to.deep.equal({status: 500});
    done();
  });
});
