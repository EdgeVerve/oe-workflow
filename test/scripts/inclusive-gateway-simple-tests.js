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

describe('Inclusive Gateway Simple Tests', function callback() {
  var workflowName = 'inclusive-gateway-simple';
  let initialMessage = { status: 'started' };
  before('define workflow', function testFunction(done) {
    /* Observed with Oracle sometimes that Upload and Execution takes around 50 seconds */
    this.timeout(60000);
    bootstrap.loadBpmnFile(workflowName, function testFunction(err) {
      done(err);
    });
  });

  after('cleanup data', function testFunction(done) {
    bootstrap.cleanUp(workflowName, done);
  });

  afterEach(function testFunction(done) {
    bootstrap.removeCompleteListener(workflowName);
    done();
  });

  it('takes path for condition 1 (>5)', function testFunction(done) {
    bootstrap.triggerAndComplete(workflowName, {
      processVariables: {
        pvField: 7
      }
    }, function testFunction(err, wfInstance, processInstance) {
      expect(err).to.not.exist;
      stateVerifier.isComplete(processInstance);
      stateVerifier.verifyFlow(processInstance, ['Start', 'IGIncoming', 'ScriptGT5', 'ScriptTest1', 'IGOutgoing', 'CheckScript', 'End']);
      expect(processInstance._processVariables).to.have.property('ScriptGT5').that.equals(true);
      expect(processInstance._processVariables).to.have.property('ScriptTest1').that.equals(true);
      expect(processInstance._processVariables).to.have.property('CheckScript').that.equals(true);
      expect(processInstance._processVariables).to.not.have.property('ScriptDivBy3');
      expect(processInstance._processVariables).to.not.have.property('ScriptDefault');
      done();
    });
  });

  it('takes path for condition 2 (div by 3)', function testFunction(done) {
    bootstrap.triggerAndComplete(workflowName, {
      processVariables: {
        pvField: 3
      }
    }, function testFunction(err, wfInstance, processInstance) {
      expect(err).to.not.exist;
      stateVerifier.isComplete(processInstance);
      stateVerifier.verifyFlow(processInstance, ['Start', 'IGIncoming', 'ScriptDivBy3', 'ScriptTest3', 'IGOutgoing', 'CheckScript', 'End']);
      expect(processInstance._processVariables).to.have.property('ScriptDivBy3').that.equals(true);
      expect(processInstance._processVariables).to.have.property('ScriptTest3').that.equals(true);
      expect(processInstance._processVariables).to.have.property('CheckScript').that.equals(true);
      expect(processInstance._processVariables).to.not.have.property('ScriptGT5');
      expect(processInstance._processVariables).to.not.have.property('ScriptDefault');
      done();
    });
  });

  it('takes path for both conditions (GT5 & div by 3) like Parallel Gateway spawns evaluated tokens and ends together before resuming next node', function testFunction(done) {
    bootstrap.triggerAndComplete(workflowName, {
      processVariables: {
        pvField: 6
      }
    }, function testFunction(err, wfInstance, processInstance) {
      expect(err).to.not.exist;
      expect(processInstance).to.exist;
      stateVerifier.isComplete(processInstance);
      /* In a Inclusive-gateway, there are multiple converting tokens created.
       * Each starts when corresponding branch completes. They all end together
       * and Next node starts after that.
       * So we can not say all IGOuts would start after all scripts complete */
      stateVerifier.verifyFlowNew(processInstance, ['Start', 'IGIncoming', ['ScriptGT5', 'ScriptDivBy3', 'ScriptTest1', 'ScriptTest3'], 'CheckScript', 'End']);
      stateVerifier.verifyPV(processInstance, {
        ScriptGT5: true,
        ScriptDivBy3: true,
        ScriptTest1: true,
        ScriptTest3: true,
        CheckScript: true
      });
      done();
    });
  });

  it('takes default path for when no condition is satisfied', function testFunction(done) {
    bootstrap.triggerAndComplete(workflowName, {
      processVariables: {
        pvField: 2
      }
    }, function testFunction(err, wfInstance, processInstance) {
      expect(err).to.not.exist;
      stateVerifier.isComplete(processInstance);
      stateVerifier.verifyFlow(processInstance, ['Start', 'IGIncoming', 'ScriptDefault', 'ScriptTest2', 'IGOutgoing', 'CheckScript', 'End']);
      expect(processInstance._processVariables).to.have.property('ScriptDefault').that.equals(true);
      expect(processInstance._processVariables).to.have.property('ScriptTest2').that.equals(true);
      expect(processInstance._processVariables).to.have.property('CheckScript').that.equals(true);
      expect(processInstance._processVariables).to.not.have.property('ScriptGT5');
      expect(processInstance._processVariables).to.not.have.property('ScriptDivBy3');
      done();
    });
  });

  it('Inclusive Gateway passes message verbatim to all spawned children and merges message passed from each branch and passes onto the next node', function testFunction(done) {
    bootstrap.triggerAndComplete(workflowName, {
      processVariables: {
        pvField: 6
      },
      message: initialMessage
    }, function testFunction(err, wfInstance, processInstance) {
      expect(err).to.not.exist;
      expect(processInstance).to.exist;
      stateVerifier.isComplete(processInstance);
      let ScriptGT5 = stateVerifier.fetchTokenByName(processInstance, 'ScriptGT5');
      let ScriptDivBy3 = stateVerifier.fetchTokenByName(processInstance, 'ScriptDivBy3');
      let CheckScript = stateVerifier.fetchTokenByName(processInstance, 'CheckScript');
      expect(ScriptGT5).to.exist;
      expect(ScriptDivBy3).to.exist;
      expect(ScriptGT5.message).to.deep.equal(initialMessage);
      expect(ScriptDivBy3.message).to.deep.equal(initialMessage);
      expect(CheckScript.message).to.exist;
      expect(CheckScript.message).to.have.keys(['ScriptTest1', 'ScriptTest3']);
      expect(CheckScript.message.ScriptTest1).to.deep.equal({ status: 300 });
      expect(CheckScript.message.ScriptTest3).to.deep.equal({ status: 400 });
      done();
    });
  });
});
