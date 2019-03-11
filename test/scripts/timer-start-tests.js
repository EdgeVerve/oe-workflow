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

describe('Start Timer Tests', function CB() {
  let workflowName = 'timer-start';
  before('define workflow', function testFunction(done) {
    bootstrap.loadBpmnFile(workflowName, function testFunction(err) {
      done(err);
    });
  });
  after('cleanup data', function testFunction(done) {
    bootstrap.cleanUp(workflowName, done);
  });


  describe('Simple Tests', function CB() {
    let workflowInstance;
    let processInstance;
    let workflowPayload = {};

    before('trigger and complete workflow', function testFunction(done) {
      bootstrap.triggerAndComplete(workflowName, workflowPayload, function testFunction(err, wfInstance, procInstance) {
        workflowInstance = wfInstance;
        processInstance = procInstance;
        done(err);
      });
    });

    it('Start Timer node executes and completes', function CB(done) {
      expect(workflowInstance).to.exist;
      workflowInstance.processes({}, bootstrap.defaultContext, function CB(err, instances) {
        expect(err).to.not.exist;
        expect(instances).to.exist.and.be.an('array').of.length(1);
        let instance = instances[0];
        stateVerifier.isComplete(instance);
        stateVerifier.verifyTokens(instance, ['StartTimer', 'ScriptTask', 'End']);
        done();
      });
    });

    it('StartTimer waits for specified time', function testFunction(done) {
      expect(processInstance).to.exist;
      stateVerifier.verifyTimerCompletion(processInstance, 'StartTimer', 600);
      done();
    });
  });
});
