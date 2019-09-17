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

describe('Inclusive Gateway Complex Tests', function callback() {
  var workflowName = 'inclusive-gateway-complex';
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

  it('Multiple Inclusive Gateways Tests', function testFunction(done) {
    bootstrap.triggerAndComplete(workflowName, {
      processVariables: {
        pvField: 3,
        pvField1: 4,
        pvField2: 3,
        pvField3: 1
      }
    }, function testFunction(err, wfInstance, processInstance) {
      expect(err).to.not.exist;
      stateVerifier.isComplete(processInstance);
      expect(processInstance._processTokens).to.exist;
      let IG1Out = Object.values(processInstance._processTokens).find(item => item.name === 'IG1Out').endTime;
      let IG2Out = Object.values(processInstance._processTokens).find(item => item.name === 'IG2Out').endTime;
      let IG3Out = Object.values(processInstance._processTokens).find(item => item.name === 'IG3Out').endTime;
      let IG4Out = Object.values(processInstance._processTokens).find(item => item.name === 'IG4Out').endTime;
      let IG1EndTime = new Date(IG1Out);
      let IG2EndTime = new Date(IG2Out);
      let IG3EndTime = new Date(IG3Out);
      let IG4EndTime = new Date(IG4Out);
      expect(IG3EndTime).to.beforeTime(IG2EndTime);
      expect(IG2EndTime).to.beforeTime(IG1EndTime);
      expect(IG4EndTime).to.beforeTime(IG1EndTime);
      expect(processInstance._processVariables).to.not.have.property('Script2');
      expect(processInstance._processVariables).to.have.property('Script4').that.equals(true);
      expect(processInstance._processVariables).to.not.have.property('Script6');
      expect(processInstance._processVariables).to.have.property('Script9').that.equals(true);
      done();
    });
  });
});
