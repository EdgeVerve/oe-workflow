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

describe('Exclusive Gateway Tests', function callback() {
  var workflowName = 'exclusive-gateway';
  before('define workflow', function testFunction(done) {
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

  it('Takes path A for condition 1', function testFunction(done) {
    bootstrap.triggerAndComplete(workflowName, {
      processVariables: {
        pvField: 1
      }
    }, function testFunction(err, wfInstance, processInstance) {
      expect(err).to.not.exist;
      stateVerifier.isComplete(processInstance);
      stateVerifier.verifyFlow(processInstance, ['Start', 'InitTask', 'EGIn', 'TaskA', 'EGOut', 'End']);
      expect(processInstance._processVariables).to.have.property('a').that.equals(10);
      expect(processInstance._processVariables).to.not.have.property('b');
      expect(processInstance._processVariables).to.not.have.property('c');
      done();
    });
  });

  it('Takes path B for condition 2', function testFunction(done) {
    bootstrap.triggerAndComplete(workflowName, {
      processVariables: {
        pvField: 2
      }
    }, function testFunction(err, wfInstance, processInstance) {
      expect(err).to.not.exist;
      stateVerifier.isComplete(processInstance);
      stateVerifier.verifyFlow(processInstance, ['Start', 'InitTask', 'EGIn', 'TaskB', 'EGOut', 'End']);
      expect(processInstance._processVariables).to.have.property('b').that.equals(20);
      expect(processInstance._processVariables).to.not.have.property('a');
      expect(processInstance._processVariables).to.not.have.property('c');
      done();
    });
  });

  it('Assumes default path when no conditions are met', function testFunction(done) {
    bootstrap.triggerAndComplete(workflowName, {
      processVariables: {
        pvField: 56
      }
    }, function testFunction(err, wfInstance, processInstance) {
      expect(err).to.not.exist;
      stateVerifier.isComplete(processInstance);
      stateVerifier.verifyFlow(processInstance, ['Start', 'InitTask', 'EGIn', 'TaskC', 'EGOut', 'End']);
      expect(processInstance._processVariables).to.have.property('c').that.equals(30);
      expect(processInstance._processVariables).to.not.have.property('a');
      expect(processInstance._processVariables).to.not.have.property('b');
      done();
    });
  });
});
