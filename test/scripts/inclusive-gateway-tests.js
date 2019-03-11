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
var Status = bootstrap.Status;

describe('Inclusive Gateway Tests', function callback() {
  var workflowName = 'inclusive-gateway';
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
      stateVerifier.verifyTokens(processInstance, [{name: 'Start', status: Status.COMPLETE}, {name: 'IGIn', status: Status.COMPLETE}, {name: 'ScriptGT5', status: Status.COMPLETE}, {name: 'End1', status: Status.COMPLETE}]);
      expect(processInstance._processVariables).to.have.property('ScriptGT5').that.equals(true);
      expect(processInstance._processVariables).to.not.have.property('ScriptEven');
      done();
    });
  });

  it('takes path for condition 2 (even)', function testFunction(done) {
    bootstrap.triggerAndComplete(workflowName, {
      processVariables: {
        pvField: 4
      }
    }, function testFunction(err, wfInstance, processInstance) {
      expect(err).to.not.exist;
      stateVerifier.isComplete(processInstance);
      stateVerifier.verifyTokens(processInstance, [{name: 'Start', status: Status.COMPLETE}, {name: 'IGIn', status: Status.COMPLETE}, {name: 'ScriptEven', status: Status.COMPLETE}, {name: 'End2', status: Status.COMPLETE}]);
      expect(processInstance._processVariables).to.have.property('ScriptEven').that.equals(true);
      expect(processInstance._processVariables).to.not.have.property('ScriptGT5');
      done();
    });
  });


  it('takes path for both conditions (>5 & even)', function testFunction(done) {
    bootstrap.triggerAndComplete(workflowName, {
      processVariables: {
        pvField: 8
      }
    }, function testFunction(err, wfInstance, processInstance) {
      expect(err).to.not.exist;
      stateVerifier.isComplete(processInstance);
      stateVerifier.verifyTokens(processInstance, [{name: 'Start', status: Status.COMPLETE}, {name: 'IGIn', status: Status.COMPLETE}, {name: 'ScriptGT5', status: Status.COMPLETE}, {name: 'ScriptEven', status: Status.COMPLETE}, {name: 'End1', status: Status.COMPLETE}, {name: 'End2', status: Status.COMPLETE}]);
      expect(processInstance._processVariables).to.have.property('ScriptGT5').that.equals(true);
      expect(processInstance._processVariables).to.have.property('ScriptEven').that.equals(true);
      done();
    });
  });
});
