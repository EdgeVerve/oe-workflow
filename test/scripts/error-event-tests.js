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
let stateVerifier = require('../utils/state-verifier');
let async = require('async');

describe('Error Event Tests', function CB() {
  let workflowNameChild = 'error-event-child';
  let workflowNameMain = 'error-event-main';
  before('define workflow', function testFunction(done) {
    bootstrap.loadBpmnFile(workflowNameChild, function testFunction(err1) {
      bootstrap.loadBpmnFile(workflowNameMain, function testFunction(err2) {
        done(err1 || err2);
      });
    });
  });
  after('Cleanup data', function testFunction(done) {
    bootstrap.cleanUp(workflowNameMain, function testFunction(err1) {
      bootstrap.cleanUp(workflowNameChild, function testFunction(err2) {
        done(err1 || err2);
      });
    });
  });

  function loadProcessInstances(workflowInstance, callback) {
    expect(workflowInstance).to.exist;
    workflowInstance.processes({}, bootstrap.defaultContext, function CB(err, instances) {
      expect(err).to.not.exist;
      expect(instances).to.exist.and.be.an('array').of.length(3);
      let mainPI = instances.find(v => {
        return v.processDefinitionName === workflowNameMain;
      });
      let subPI = instances.find(v => {
        return v.processDefinitionName === (workflowNameMain + '$Sub');
      });
      let subChildPI = instances.find(v => {
        return v.processDefinitionName === workflowNameChild;
      });
      callback(mainPI, subPI, subChildPI);
    });
  }

  describe('Simple Tests', function testFunction() {
    let workflowInstance;
    let mainProcess;
    let subProcess;
    let workflowPayload = {
      processVariables: {},
      message: {}
    };

    before('trigger workflow and wait for sub-process task', function testFunction(done) {
      bootstrap.onUserTask(workflowNameChild, 'UserTask', function testFunction(err, task) {
        expect(err).to.not.exist;
        loadProcessInstances(workflowInstance, function testFunction(mainPI, childPI, childSubPI) {
          mainProcess = mainPI;
          subProcess = childPI;
          done();
        });
      });
      bootstrap.triggerWorkflow(workflowNameMain, workflowPayload, function testFunction(err, wfInstance) {
        expect(err).to.not.exist;
        expect(wfInstance).to.exist;
        workflowInstance = wfInstance;
      });
    });

    after('remove listeners', function testFunction(done) {
      bootstrap.removeUserTaskListener(workflowNameChild, 'UserTask');
      bootstrap.removeCompleteListener(workflowNameChild);
      bootstrap.removeCompleteListener(workflowNameMain);
      done();
    });

    it('Main Process waits for sub-process and maintains token for error-catch event', function testFunction(done) {
      stateVerifier.isRunning(mainProcess);
      stateVerifier.verifyTokens(mainProcess, ['Start', {
        name: 'Sub',
        status: Status.PENDING
      }, {
        name: 'ErrorSubCatch',
        status: Status.PENDING
      }]);
      done();
    });

    it('Sub Process waits for call-activity and maintains token for error-catch event', function testFunction(done) {
      stateVerifier.isRunning(subProcess);
      stateVerifier.verifyTokens(subProcess, ['Start', 'SubScript', {
        name: 'CallActivity',
        status: Status.PENDING
      }, {
        name: 'ErrorCACatch',
        status: Status.PENDING
      }]);
      done();
    });
  });

  describe('When Call Activity raises an Error-Event caught by parent subprocess', function testFunction() {
    let workflowInstance;
    let mainProcess;
    let subProcess;
    let subChildProcess;

    before('Complete the task to trigger error event', function testFunction(done) {
      bootstrap.triggerWorkflow(workflowNameMain, {}, function testFunction(err, wfInstance) {
        expect(err).to.not.exist;
        workflowInstance = wfInstance;
      });
      bootstrap.onUserTask(workflowNameChild, 'UserTask', function testFunction(err, task) {
        expect(err).to.not.exist;
        task.complete({
          pv: {},
          msg: {
            count: 15
          }
        }, bootstrap.defaultContext, function testFunction(err, task) {
          expect(err).to.not.exist;
          expect(task.status).to.equal(Status.COMPLETE);
        });
      });
      bootstrap.onComplete(workflowNameMain, function testFunction(err, instance) {
        expect(err).to.not.exist;
        loadProcessInstances(workflowInstance, function testFunction(mainPI, childPI, childSubPI) {
          mainProcess = mainPI;
          subProcess = childPI;
          subChildProcess = childSubPI;
          done();
        });
      });
    });

    it('Call-Activity is interrupted', function testFunction(done) {
      stateVerifier.isInterrupted(subChildProcess);
      stateVerifier.verifyTokens(subChildProcess, ['Start', 'UserTask', 'gw', 'ErrorEnd1', {
        name: 'UserTask2',
        status: Status.INTERRUPTED
      }]);
      done();
    });

    it('CallActivity is interrupted and SubProcess completes', function testFunction(done) {
      stateVerifier.isComplete(subProcess);
      stateVerifier.verifyTokens(subProcess, ['Start', 'SubScript', {
        name: 'CallActivity',
        status: Status.INTERRUPTED
      }, 'ErrorCACatch', 'SubEnd2']);
      done();
    });

    it('Main Error-Catch is interrupted and process completes', function testFunction(done) {
      stateVerifier.isComplete(mainProcess);
      stateVerifier.verifyTokens(mainProcess, ['Start', 'Sub', {
        name: 'ErrorSubCatch',
        status: Status.INTERRUPTED
      }, 'NormalEnd']);
      done();
    });
  });


  describe('When Call Activity raises an Error-Event NOT caught by parent', function testFunction() {
    let workflowInstance;
    let mainProcess;
    let subProcess;
    let subChildProcess;

    before('Trigger and Complete the task to trigger cross-boundary error', function testFunction(done) {
      bootstrap.triggerWorkflow(workflowNameMain, {}, function testFunction(err, wfInstance) {
        expect(err).to.not.exist;
        workflowInstance = wfInstance;
      });
      bootstrap.onUserTask(workflowNameChild, 'UserTask', function testFunction(err, task) {
        expect(err).to.not.exist;
        task.complete({
          pv: {},
          msg: {
            count: 5
          }
        }, bootstrap.defaultContext, function testFunction(err, task) {
          expect(err).to.not.exist;
          expect(task.status).to.equal(Status.COMPLETE);
        });
      });

      async.parallel([
        function waitMain(cb) {
          bootstrap.onComplete(workflowNameMain, cb);
        },
        function waitChild(cb) {
          bootstrap.onInterrupted(workflowNameChild, cb);
        }
      ], function allDone(err) {
        expect(err).to.not.exist;
        loadProcessInstances(workflowInstance, function testFunction(mainPI, childPI, childSubPI) {
          mainProcess = mainPI;
          subProcess = childPI;
          subChildProcess = childSubPI;
          done();
        });
      });
    });

    it('Call-Activity is interrupted', function testFunction(done) {
      stateVerifier.isInterrupted(subChildProcess);
      stateVerifier.verifyTokens(subChildProcess, ['Start', 'UserTask', 'gw', 'EndSubProcess', {
        name: 'UserTask2',
        status: Status.INTERRUPTED
      }]);
      done();
    });

    it('SubProcess is interrupted', function testFunction(done) {
      stateVerifier.isInterrupted(subProcess);
      stateVerifier.verifyTokens(subProcess, ['Start', 'SubScript', {
        name: 'CallActivity',
        status: Status.INTERRUPTED
      }, {
        name: 'ErrorCACatch',
        status: Status.INTERRUPTED
      }]);
      done();
    });

    it('Main Process is completed via error-catch route', function testFunction(done) {
      stateVerifier.isComplete(mainProcess);
      stateVerifier.verifyTokens(mainProcess, ['Start', {
        name: 'Sub',
        status: Status.INTERRUPTED
      }, 'ErrorSubCatch', 'ErrorCatchEnd']);
      done();
    });
  });
});
