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

describe('Call Activity Tests', function CB() {
  let workflowNameChild = 'call-activity-child';
  let workflowNameMain = 'call-activity-main';
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
        return v.processDefinitionName === 'call-activity-main';
      });
      let childPI = instances.find(v => {
        return v.processDefinitionName === 'call-activity-child';
      });
      let childSubPI = instances.find(v => {
        return v.processDefinitionName === 'call-activity-child$Sub';
      });
      callback(mainPI, childPI, childSubPI);
    });
  }

  describe('Simple Tests', function testFunction() {
    let workflowInstance;
    let mainProcess;
    let childProcess;
    let childSubProcess;
    let userTask;
    let workflowPayload = {
      processVariables: {
        inputPV1: '_value1_',
        inputPV2: '_value2_',
        failTest: 'NoFailure'
      },
      message: {}
    };

    before('trigger workflow and wait for sub-process task', function testFunction(done) {
      bootstrap.onUserTask(workflowNameChild + '$Sub', 'SubUserTask', function testFunction(err, task) {
        expect(err).to.not.exist;
        userTask = task;
        loadProcessInstances(workflowInstance, function testFunction(mainPI, childPI, childSubPI) {
          mainProcess = mainPI;
          childProcess = childPI;
          childSubProcess = childSubPI;
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
      bootstrap.removeUserTaskListener(workflowNameChild + '$Sub', 'SubUserTask');
      bootstrap.removeCompleteListener(workflowNameChild);
      bootstrap.removeCompleteListener(workflowNameMain);
      done();
    });
    it('Workflow has parent and sub process instances', function CB(done) {
      expect(workflowInstance).to.exist;
      workflowInstance.processes({}, bootstrap.defaultContext, function CB(err, instances) {
        expect(err).to.not.exist;
        expect(instances).to.exist.and.be.an('array').of.length(3);
        let names = instances.map(v => {
          return v.processDefinitionName;
        });
        expect(names).to.have.members(['call-activity-main', 'call-activity-child', 'call-activity-child$Sub']);
        done();
      });
    });

    it('main process instance has no parent', function callback(done) {
      mainProcess.parentProcess({}, bootstrap.defaultContext, function callback(err, instance) {
        expect(err).to.not.exist;
        expect(instance).to.not.exist;
        done();
      });
    });

    it('main process has child sub process', function callback(done) {
      mainProcess.subProcesses({}, bootstrap.defaultContext, function callback(err, instances) {
        expect(err).to.not.exist;
        expect(instances).to.exist.and.be.an('array').of.length(1);
        expect(instances[0].id).to.deep.equal(childProcess.id);
        done();
      });
    });

    it('child process instance has main as parent', function callback(done) {
      childProcess.parentProcess({}, bootstrap.defaultContext, function callback(err, instance) {
        expect(err).to.not.exist;
        expect(instance).to.exist;
        expect(instance.id).to.deep.equal(mainProcess.id);
        done();
      });
    });

    it('child process has sub-process child', function testFunction(done) {
      childProcess.subProcesses({}, bootstrap.defaultContext, function callback(err, instances) {
        expect(err).to.not.exist;
        expect(instances).to.exist.and.be.an('array').of.length(1);
        expect(instances[0].id).to.deep.equal(childSubProcess.id);
        done();
      });
    });

    it('child-sub process instance has child as parent', function callback(done) {
      childSubProcess.parentProcess({}, bootstrap.defaultContext, function callback(err, instance) {
        expect(err).to.not.exist;
        expect(instance).to.exist;
        expect(instance.id).to.deep.equal(childProcess.id);
        done();
      });
    });

    it('child-sub process has no further subprocesses', function callback(done) {
      childSubProcess.subProcesses({}, bootstrap.defaultContext, function callback(err, instances) {
        expect(err).to.not.exist;
        expect(instances).to.exist.and.be.an('array').of.length(0);
        done();
      });
    });

    it('main process instance has no parent-ProcessVariables', function callback(done) {
      expect(mainProcess._parentProcessVariables).to.not.exist;
      done();
    });

    it('main process waits for child to complete', function testFunction(done) {
      stateVerifier.isRunning(mainProcess);
      stateVerifier.verifyTokens(mainProcess, ['Start', 'MainScript', {
        name: 'ChildAct',
        status: Status.PENDING
      }]);
      done();
    });

    it('child process waits for subprocess to complete', function testFunction(done) {
      stateVerifier.isRunning(childProcess);
      stateVerifier.verifyTokens(childProcess, ['Start', 'ChildScript', {
        name: 'Sub',
        status: Status.PENDING
      }]);
      done();
    });

    it('sub process waits for user-task to complete', function testFunction(done) {
      stateVerifier.isRunning(childSubProcess);
      stateVerifier.verifyTokens(childSubProcess, ['SubStart', 'SubScript', {
        name: 'SubUserTask',
        status: Status.PENDING
      }]);
      done();
    });


    it('child-process has parent-token populated', function testFunction() {
      stateVerifier.isRunning(childProcess);
      var callActivityToken = stateVerifier.fetchTokenByName(mainProcess, 'ChildAct');
      expect(childProcess.parentToken).to.exist;
      expect(childProcess.parentToken.name).to.equal(callActivityToken.name);
      expect(childProcess.parentToken.bpmnId).to.equal(callActivityToken.bpmnId);
      expect(childProcess.parentToken.id).to.equal(callActivityToken.id);
    });


    it('subprocess has parent-token populated', function testFunction() {
      stateVerifier.isRunning(childSubProcess);
      var subToken = stateVerifier.fetchTokenByName(childProcess, 'Sub');
      expect(childSubProcess.parentToken).to.exist;
      expect(childSubProcess.parentToken.name).to.equal(subToken.name);
      expect(childSubProcess.parentToken.bpmnId).to.equal(subToken.bpmnId);
      expect(childSubProcess.parentToken.id).to.equal(subToken.id);
    });

    it('parent-PVs of child-process are same as PVs of main', function testFunction(done) {
      stateVerifier.verifyPV(mainProcess, childProcess._parentProcessVariables);
      done();
    });

    it('Parent\'s process variables are NOT copied over to child', function testFunction() {
      expect(childProcess._processVariables.inputPV2).to.not.exist;
    });

    it('But they are accessible in child scripts via pv() function parentProcessVariables', function testFunction() {
      expect(childProcess._processVariables.inputPV1).to.equal(mainProcess._processVariables.inputPV1 + 'ChildOverride');
      expect(childProcess._processVariables.childDirect).to.equal(mainProcess._processVariables.inputPV1 + 'ChildSuffix');
    });

    it('Main Process Variables are passed to child process through In-Out Mapping', function testFunction(done) {
      expect(childProcess._processVariables).to.exist.and.not.have.property('toChild');
      expect(childProcess._processVariables.fromParent).to.exist.equal(mainProcess._processVariables.toChild);
      done();
    });

    it('parent-PVs of sub-process are same as PV of child', function testFunction(done) {
      stateVerifier.verifyPV(childProcess, childSubProcess._parentProcessVariables);
      done();
    });

    it('ChildProcess PV are copied over to SubProcess PV', function testFunction() {
      expect(childSubProcess._processVariables.fromParent).to.equal(childProcess._processVariables.fromParent);
      expect(childSubProcess._processVariables.childDirect).to.equal(childProcess._processVariables.childDirect);
    });

    it('Parent PV of Subprocesses are union of Child\'s PV and Child\'s ParentPV i.e. main-process PV', function testFunction() {
      expect(childSubProcess._parentProcessVariables.inputPV2).to.equal(mainProcess._processVariables.inputPV2);
      expect(childSubProcess._parentProcessVariables.toChild).to.equal(mainProcess._processVariables.toChild);
      expect(childSubProcess._parentProcessVariables.fromParent).to.equal(childProcess._processVariables.fromParent);
      expect(childSubProcess._parentProcessVariables.toParent).to.equal(childProcess._processVariables.toParent);
      expect(childSubProcess._parentProcessVariables.childDirect).to.equal(childProcess._processVariables.childDirect);
    });

    it('InputParameters are copied to ChildProcess PV', function testFunction() {
      expect(mainProcess._processVariables.Input1).to.not.exist;
      expect(childProcess._processVariables.Input1).to.equal('Awesome');
    });

    it('OutputParameters are not available on main process untill child-process returns', function testFunction() {
      expect(mainProcess._processVariables.output).to.not.exist;
    });

    describe('Post Completion', function testFunction() {
      before('complete the task and flow', function testFunction(done) {
        expect(userTask).to.exist;
        userTask.complete({
          pv: {
            taskPV: 'taskPV'
          }
        }, bootstrap.defaultContext, function testFunction(err, task) {
          expect(err).to.not.exist;
          expect(task.status).to.equal(Status.COMPLETE);
        });
        bootstrap.onComplete(workflowNameMain, function testFunction(err, instance) {
          expect(err).to.not.exist;
          loadProcessInstances(workflowInstance, function testFunction(mainPI, childPI, childSubPI) {
            mainProcess = mainPI;
            childProcess = childPI;
            childSubProcess = childSubPI;
            done();
          });
        });
      });

      it('When Sub-Process user-task is completed, it bubbles up the completion', function testFunction(done) {
        stateVerifier.isComplete(childSubProcess);
        stateVerifier.verifyTokens(childSubProcess, ['SubStart', 'SubScript', 'SubUserTask', 'Script2', 'SubEnd']);
        stateVerifier.isComplete(childProcess);
        stateVerifier.verifyTokens(childProcess, ['Start', 'ChildScript', 'Sub', 'End']);
        stateVerifier.isComplete(mainProcess);
        stateVerifier.verifyTokens(mainProcess, ['Start', 'MainScript', 'ChildAct', 'End']);
        done();
      });

      it('Copies SubProcess PV back to ChildProcess PV', function testFunction() {
        expect(childProcess._processVariables.inputPV1).to.equal(childSubProcess._processVariables.inputPV1);
        expect(childProcess._processVariables.subDirect).to.equal(childSubProcess._processVariables.subDirect);
        expect(childProcess._processVariables.toParent).to.equal(childSubProcess._processVariables.toParent);

        expect(childProcess._processVariables.taskPV).to.equal(childSubProcess._processVariables.taskPV);
      });

      it('Only in-out mapped PV are copied back from child to main process', function testFunction() {
        expect(mainProcess._processVariables.childDirect).to.not.exist;
        expect(mainProcess._processVariables.subDirect).to.not.exist;
        expect(mainProcess._processVariables.inputPV1).to.not.equal(childProcess._processVariables.inputPV1);

        expect(mainProcess._processVariables.toParent).to.not.exist;
        expect(mainProcess._processVariables.fromChild).to.equal(childProcess._processVariables.toParent);
      });

      it('outputParameters are copied to MainProcess PV', function testFunction() {
        expect(childProcess._processVariables.output).to.not.exist;
        expect(mainProcess._processVariables.output).to.equal('Double Awesome');
      });
    });
  });


  describe('Failures and Retry', function testFunction() {
    let workflowInstance;
    let mainProcess;
    let childProcess;
    let childSubProcess;
    let failedToken;
    let workflowPayload = {
      processVariables: {
        //        failTest: '', /* Let 1/var.length to cause error */
        inputPV1: '_value1_',
        inputPV2: '_value2_'
      },
      message: {}
    };

    before('trigger workflow and wait for sub-process task', function testFunction(done) {
      bootstrap.onTokenStatus(workflowNameChild + '$Sub', 'Script2', Status.FAILED, function testFunction(err, instance, token) {
        expect(err).to.not.exist;
        failedToken = token;
        loadProcessInstances(workflowInstance, function testFunction(mainPI, childPI, childSubPI) {
          mainProcess = mainPI;
          childProcess = childPI;
          childSubProcess = childSubPI;
          done();
        });
      });
      bootstrap.onUserTask(workflowNameChild + '$Sub', 'SubUserTask', function testFunction(err, task) {
        expect(err).to.not.exist;
        task.complete({
          pv: {
            taskPV: 'taskPV'
          }
        }, bootstrap.defaultContext, function testFunction(err, task) {
          expect(err).to.not.exist;
          expect(task.status).to.equal(Status.COMPLETE);
        });
      });

      bootstrap.triggerWorkflow(workflowNameMain, workflowPayload, function testFunction(err, wfInstance) {
        expect(err).to.not.exist;
        expect(wfInstance).to.exist;
        workflowInstance = wfInstance;
      });
    });

    after('remove listeners', function testFunction(done) {
      bootstrap.removeUserTaskListener(workflowNameChild + '$Sub', 'SubUserTask');
      bootstrap.removeCompleteListener(workflowNameChild);
      bootstrap.removeCompleteListener(workflowNameMain);
      done();
    });

    it('Child process fails and stops', function testFunction(done) {
      expect(mainProcess).to.exist;
      expect(childProcess).to.exist;
      expect(childSubProcess).to.exist;

      expect(failedToken).to.exist;
      expect(failedToken.name).to.equal('Script2');
      expect(failedToken.status).to.equal(Status.FAILED);
      done();
    });

    it('Process can be retried via SubProcess', function testFunction(done) {
      let token = stateVerifier.fetchTokenByName(childSubProcess, 'Script2');
      expect(token).to.exist.and.have.property('status').that.equals(Status.FAILED);

      childSubProcess.retry(token.id, {
        failTest: 'OK'
      }, bootstrap.defaultContext, function testFunction(err, instance) {
        expect(err).to.not.exist;
      });
      bootstrap.onComplete(workflowNameMain, function testFunction(err, instance) {
        expect(err).to.not.exist;
        stateVerifier.isComplete(instance);
        done();
      });
    });
  });
});
