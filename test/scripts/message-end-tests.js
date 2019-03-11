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
let Status = bootstrap.Status;

describe('Message End Event Tests', function CB() {
  let workflowName = 'message-end';
  let processInstance;
  let userTask;
  before('define workflow', function testFunction(done) {
    bootstrap.loadBpmnFile(workflowName, function testFunction(err) {
      expect(err).to.not.exist;
      bootstrap.triggerWaitForUserTask(workflowName, {}, 'UserTask', function testFunction(err, wfInst, procInst, task) {
        expect(err).to.not.exist;
        processInstance = procInst;
        userTask = task;
        done();
      });
    });
  });
  after('cleanup data', function testFunction(done) {
    bootstrap.removeCompleteListener(workflowName);
    bootstrap.cleanUp(workflowName, done);
  });

  it('Receiver waits for the message', function testFunction(done) {
    expect(processInstance).to.exist;
    stateVerifier.isRunning(processInstance);
    stateVerifier.verifyTokens(processInstance, ['Start', 'ScriptA', 'ParallelGWay', 'Wait200', {
      name: 'UserTask',
      status: Status.PENDING
    }, {
      name: 'MessageCatch',
      status: Status.PENDING
    }]);
    done();
  });

  it('MessageEnd sends the message and receiver resumes execution', function testFunction(done) {
    expect(userTask).to.exist;
    stateVerifier.isRunning(processInstance);
    userTask.complete({}, bootstrap.defaultContext, function testFunction(err, task) {
      expect(err).to.not.exist;
      expect(task.status).to.equal('complete');
      userTask = task;
    });
    bootstrap.onComplete(workflowName, function testFunction(err, instance) {
      expect(err).to.not.exist;
      stateVerifier.isComplete(instance);
      stateVerifier.verifyTokens(instance, ['Start', 'ScriptA', 'ParallelGWay', 'Wait200', 'UserTask', 'MessageCatch', 'MessageEnd', 'ScriptB', 'End']);
      processInstance = instance;
      done();
    });
  });
});
