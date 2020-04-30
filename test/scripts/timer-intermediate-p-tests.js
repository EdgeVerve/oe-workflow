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
let models = bootstrap.app.models;

let stateVerifier = require('../utils/state-verifier');

describe('Intermediate Timer Tests (P)', function CB() {
  this.timeout(15000);
  let workflowName = 'timer-intermediate-p';
  before('define workflow', function testFunction(done) {
    bootstrap.loadBpmnFile(workflowName, function testFunction(err) {
      if (err) {
        return done(err);
      }
      models.MasterControl.enable('WORKFLOW-MONITOR', function enableCb(err) {
        if (err) {
          done(err);
        } else {
          bootstrap.app.once('start-workflow-monitoring', done);
        }
      });
    });
  });
  after('cleanup data', function testFunction(done) {
    bootstrap.app.once('stop-workflow-monitoring', function cb() {
      bootstrap.removeCompleteListener(workflowName);
      bootstrap.cleanUp(workflowName, done);
    });
    models.MasterControl.disable('WORKFLOW-MONITOR', 'tests-completed', function cb(err, response) {
      expect(err).to.not.exist;
      expect(response).to.equal('Flagged WORKFLOW-MONITOR as disabled');
    });
  });

  it('Timer node completes when period is specified', function testFunction(done) {
    bootstrap.triggerAndComplete(workflowName, {processVariables: {timeDuration: 'PT2S'}}, function testFunction(err, wfInstance, procInstance) {
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
      done();
    });
  });

  it('Timer node completes when millisecond duration is given', function testFunction(done) {
    bootstrap.triggerAndComplete(workflowName, {processVariables: {timeDuration: 2000}}, function testFunction(err, wfInstance, procInstance) {
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
      done();
    });
  });

  it('Timer node completes when absolute date is specified', function testFunction(done) {
    let targetDate = new Date();
    targetDate.setSeconds(targetDate.getSeconds() + 4);
    bootstrap.triggerAndComplete(workflowName, {processVariables: {timeDuration: targetDate.toISOString()}}, function testFunction(err, wfInstance, procInstance) {
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
      done();
    });
  });
});
