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

describe('SubProcess Boundary Interrupting Tests', function CB() {
  let workflowName = 'subprocess-boundary-interrupting';
  let workflowInstance;
  let mainInstance;
  let subInstance;

  function loadProcessInstances(callback) {
    expect(workflowInstance).to.exist;
    workflowInstance.processes({}, bootstrap.defaultContext, function CB(err, instances) {
      expect(err).to.not.exist;
      expect(instances).to.exist.and.be.an('array').of.length(2);
      let mainPI = instances.find(v => {
        return v.processDefinitionName === 'subprocess-boundary-interrupting';
      });
      let subPI = instances.find(v => {
        return v.processDefinitionName === 'subprocess-boundary-interrupting$Sub';
      });
      callback(mainPI, subPI);
    });
  }


  before('define workflow', function testFunction(done) {
    bootstrap.loadBpmnFile(workflowName, function testFunction(err) {
      done(err);
    });
  });
  after('Cleanup data', function testFunction(done) {
    bootstrap.cleanUp(workflowName, done);
  });

  beforeEach(function testFunction(done) {
    bootstrap.onUserTask(workflowName + '$Sub', 'TaskC', function testFunction(err, task) {
      expect(err).to.not.exist;
      loadProcessInstances(function testFunction(mainPI, subPI) {
        mainInstance = mainPI;
        subInstance = subPI;
        done();
      });
    });
    bootstrap.triggerWorkflow(workflowName, {}, function testFunction(err, wfInstance) {
      expect(err).to.not.exist;
      workflowInstance = wfInstance;
    });
  });

  afterEach(function testFunction(done) {
    workflowInstance = null;
    mainInstance = null;
    subInstance = null;
    bootstrap.removeUserTaskListener(workflowName + '$Sub', 'TaskC');
    bootstrap.removeTokenStatusListener(workflowName);
    bootstrap.removeCompleteListener(workflowName);
    bootstrap.removeCompleteListener(workflowName + '$Sub');
    done();
  });

  it('Subprocess is interrupted, when main user-task is completed', function testFunction(done) {
    expect(mainInstance).to.exist;
    mainInstance.tasks({}, bootstrap.defaultContext, function testFunction(err, tasks) {
      expect(err).to.not.exist;
      expect(tasks).to.exist.and.be.an('array').of.length(1);
      tasks[0].complete({}, bootstrap.defaultContext, function testFunction(err, task) {
        expect(err).to.not.exist;
        expect(task).to.exist.and.have.property('status').that.equals(Status.COMPLETE);
      });
    });
    bootstrap.onComplete(workflowName, function testFunction(err, instance) {
      expect(err).to.not.exist;
      loadProcessInstances(function testFunction(mainPI, subPI) {
        stateVerifier.isInterrupted(subPI);
        stateVerifier.isComplete(mainPI);

        stateVerifier.verifyTokens(mainPI, ['Start', 'TaskA', {
          name: 'Sub',
          status: Status.INTERRUPTED
        }, 'TaskB', 'catch', 'Throw', 'End2', 'End3']);
        stateVerifier.verifyTokens(subPI, ['SubStart', {
          name: 'TaskC',
          status: Status.INTERRUPTED
        }]);
        done();
      });
    });
  });

  it('When sub user-task is completed, subprocess completes and main waits for ', function testFunction(done) {
    expect(subInstance).to.exist;
    subInstance.tasks({}, bootstrap.defaultContext, function testFunction(err, tasks) {
      expect(err).to.not.exist;
      expect(tasks).to.exist.and.be.an('array').of.length(1);
      tasks[0].complete({}, bootstrap.defaultContext, function testFunction(err, task) {
        expect(err).to.not.exist;
        expect(task).to.exist.and.have.property('status').that.equals(Status.COMPLETE);
      });
    });
    bootstrap.onComplete(workflowName + '$Sub', function testFunction(err, subPI) {
      expect(err).to.not.exist;
      stateVerifier.isComplete(subPI);
      stateVerifier.verifyTokens(subPI, ['SubStart', 'TaskC', 'SubEnd']);
    });
    bootstrap.onTokenStatus(workflowName, 'End', Status.COMPLETE, function testFunction(err, mainPI, token) {
      expect(err).to.not.exist;
      expect(mainPI).to.exist;
      stateVerifier.isRunning(mainPI);
      stateVerifier.verifyTokens(mainPI, ['Start', 'TaskA', 'Sub', 'End', {
        name: 'catch',
        status: Status.INTERRUPTED
      }, {
        name: 'TaskB',
        status: Status.PENDING
      }]);
      mainPI.tasks({}, bootstrap.defaultContext, function testFunction(err, tasks) {
        expect(err).to.not.exist;
        expect(tasks).to.exist.and.be.an('array').of.length(1);
        tasks[0].complete({}, bootstrap.defaultContext, function testFunction(err, task) {
          expect(err).to.not.exist;
          expect(task).to.exist.and.have.property('status').that.equals(Status.COMPLETE);
        });
      });
    });

    bootstrap.onComplete(workflowName, function testFunction(err, mainPI) {
      expect(err).to.not.exist;
      stateVerifier.isComplete(mainPI);
      stateVerifier.verifyTokens(mainPI, ['Start', 'TaskA', 'Sub', 'End', {
        name: 'catch',
        status: Status.INTERRUPTED
      }, 'TaskB', 'Throw', 'End2']);
      done();
    });
  });
});
