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

describe('Boundary Timer Tests (P)', function CB() {
  this.timeout(15000);
  let workflowName = 'timer-boundary-p';
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

  it('(interrupting and non-interrupting) Boundary Timers trigger and complete', function testFunction(done) {
    bootstrap.onComplete(workflowName, function testFunction(err, procInstance) {
      expect(err).to.not.exist;
      stateVerifier.isComplete(procInstance);
      expect(procInstance._processVariables.execCount).to.equal(3);
      expect(procInstance._processVariables.interruptingCount).to.equal(1);

      stateVerifier.verifyTokens(procInstance, [{
        name: 'Start',
        status: Status.COMPLETE
      }, {
        name: 'UserTask',
        status: Status.INTERRUPTED
      }, {
        name: 'NIB Timer',
        status: Status.COMPLETE
      }, {
        name: 'TaskA',
        status: Status.COMPLETE
      }, {
        name: 'TaskA',
        status: Status.COMPLETE
      }, {
        name: 'TaskA',
        status: Status.COMPLETE
      }, {
        name: 'BoundaryTimer',
        status: Status.COMPLETE
      }, {
        name: 'TaskB',
        status: Status.COMPLETE
      }, {
        name: 'UT2',
        status: Status.COMPLETE
      }, {
        name: 'End',
        status: Status.COMPLETE
      }]);
      done();
    });

    bootstrap.triggerWaitForUserTask(workflowName, {processVariables: {interruptAt: 'PT10S', notifyAt: 'PT1S#PT4S#PT7S'}}, 'UT2', function testFunction(err, wfInstance, procInstance, task) {
      expect(err).to.not.exist;
      task.complete({}, bootstrap.defaultContext, function testFunction(err, task) {
        expect(err).to.not.exist;
        expect(task).to.exist.and.have.property('status').that.equals(Status.COMPLETE);
      });
    });
  });

  it('interrupting Boundary Timer, interrupts repeating non-interrupting timers', function testFunction(done) {
    bootstrap.onComplete(workflowName, function wfCompCb(err, procInstance) {
      expect(err).to.not.exist;
      stateVerifier.isComplete(procInstance);
      expect(procInstance._processVariables.execCount).to.equal(1);
      expect(procInstance._processVariables.interruptingCount).to.equal(1);

      stateVerifier.verifyTokens(procInstance, [{
        name: 'Start',
        status: Status.COMPLETE
      }, {
        name: 'UserTask',
        status: Status.INTERRUPTED
      }, {
        name: 'NIB Timer',
        status: Status.INTERRUPTED
      }, {
        name: 'TaskA',
        status: Status.COMPLETE
      }, {
        name: 'BoundaryTimer',
        status: Status.COMPLETE
      }, {
        name: 'TaskB',
        status: Status.COMPLETE
      }, {
        name: 'UT2',
        status: Status.COMPLETE
      }, {
        name: 'End',
        status: Status.COMPLETE
      }]);
      done();
    });
    bootstrap.triggerWaitForUserTask(workflowName, {processVariables: {interruptAt: 'PT6S', notifyAt: 'PT1S#PT9S#PT12S'}}, 'UT2', function testFunction(err, wfInstance, procInstance, task) {
      expect(err).to.not.exist;
      stateVerifier.isRunning(procInstance);
      expect(procInstance._processVariables.execCount).to.equal(1);
      expect(procInstance._processVariables.interruptingCount).to.equal(1);

      stateVerifier.verifyTokens(procInstance, [{
        name: 'Start',
        status: Status.COMPLETE
      }, {
        name: 'UserTask',
        status: Status.INTERRUPTED
      }, {
        name: 'NIB Timer',
        status: Status.INTERRUPTED
      }, {
        name: 'TaskA',
        status: Status.COMPLETE
      }, {
        name: 'BoundaryTimer',
        status: Status.COMPLETE
      }, {
        name: 'TaskB',
        status: Status.COMPLETE
      }, {
        name: 'UT2',
        status: Status.PENDING
      }]);

      setTimeout(function waitFor6s() {
        task.complete({}, bootstrap.defaultContext, function testFunction(err, task) {
          expect(err).to.not.exist;
          expect(task).to.exist.and.have.property('status').that.equals(Status.COMPLETE);
        });
      }, 6000);
    });
  });
});
