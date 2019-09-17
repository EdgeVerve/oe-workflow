/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

let bootstrap = require('../bootstrap.js');
let chai = bootstrap.chai;
let expect = chai.expect;
let async = require('async');
let Status = bootstrap.Status;
let stateVarifier = require('../utils/state-verifier');

describe('Nested subprocess boundary interrupting Tests', function callback() {
  let workflowName = 'nested-subprocess-interrupting';
  let childWorkflowName = 'call-activity-child';
  let mainUserTask;
  before('define workflow', function testFunction(done) {
    async.parallel([
      function waitMain(callback) {
        bootstrap.onUserTask(workflowName, 'TaskB', function cb(err, task) {
          expect(err).to.not.exist;
          mainUserTask = task;
          callback();
        });
      },
      function waitChild(callback) {
        bootstrap.onUserTask(childWorkflowName + '$Sub', 'SubUserTask', function cb(err, task) {
          expect(err).to.not.exist;
          callback();
        });
      }
    ], function cb(err, results) {
      expect(err).to.not.exist;
      done();
    });

    /* Observed with Oracle sometimes that Upload and Execution takes around 50 seconds */
    this.timeout(60000);
    bootstrap.loadBpmnFile(childWorkflowName, function testFunction(err) {
      expect(err).to.not.exist;
      bootstrap.loadAndTrigger(workflowName, {}, function testFunction(err) {
        expect(err).to.not.exist;
      });
    });
  });

  after('cleanup data', function testFunction(done) {
    bootstrap.cleanUp(workflowName, done);
  });

  it('Signal interrupts call-activity as well as nested sub-process', function testFunction(done) {
    async.parallel([
      function waitMain(callback) {
        bootstrap.onComplete(workflowName, function cb(err, instance) {
          expect(err).to.not.exist;
          stateVarifier.isComplete(instance);
          stateVarifier.verifyTokens(instance, ['Start', 'PGway', {
            name: 'Sub',
            status: Status.INTERRUPTED
          }, 'TaskB', 'Throw', 'catch', 'PGEnd', 'PGEnd', 'End']);
          expect(err).to.not.exist;
          callback();
        });
      },
      function waitMainSub(callback) {
        bootstrap.onInterrupted(workflowName + '$Sub', function cb(err, instance) {
          expect(err).to.not.exist;
          stateVarifier.isInterrupted(instance);
          stateVarifier.verifyTokens(instance, ['Start', {
            name: 'TaskB',
            status: Status.INTERRUPTED
          }]);
          expect(err).to.not.exist;
          callback();
        });
      },
      function waitChild(callback) {
        bootstrap.onInterrupted(childWorkflowName, function cb(err, instance) {
          expect(err).to.not.exist;
          stateVarifier.isInterrupted(instance);
          stateVarifier.verifyTokens(instance, ['Start', 'ChildScript', {
            name: 'Sub',
            status: Status.INTERRUPTED
          }]);
          expect(err).to.not.exist;
          callback();
        });
      },
      function waitChildSub(callback) {
        bootstrap.onInterrupted(childWorkflowName + '$Sub', function cb(err, instance) {
          expect(err).to.not.exist;
          stateVarifier.isInterrupted(instance);
          stateVarifier.verifyTokens(instance, ['SubStart', 'SubScript', {
            name: 'SubUserTask',
            status: Status.INTERRUPTED
          }]);
          expect(err).to.not.exist;
          callback();
        });
      }
    ], function cb(err, results) {
      expect(err).to.not.exist;
      done();
    });


    mainUserTask.complete({}, bootstrap.defaultContext, function cb(err, task) {
      expect(err).to.not.exist;
      expect(task).to.exist;
      expect(task.status).to.equal(Status.COMPLETE);
    });
  });
});
