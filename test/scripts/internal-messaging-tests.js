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

describe('Internal Messaging Tests', function CB() {
  let workflowName = 'internal-messaging';
  let senderFlowName = workflowName + '$Sender';
  let receiver1FlowName = workflowName + '$Receiver1';
  let receiver2FlowName = workflowName + '$Receiver2';
  let workflowInstance;
  before('define workflow', function testFunction(done) {
    bootstrap.loadAndTrigger(workflowName, {}, function testFunction(err, wfDefn, wfInst) {
      expect(err).to.not.exist;
      expect(wfInst).to.exist;
      workflowInstance = wfInst;
    });
    bootstrap.onComplete(receiver1FlowName, function testFunction(err, instance) {
      expect(err).to.not.exist;
      done();
    });
  });
  after('cleanup data', function testFunction(done) {
    bootstrap.removeCompleteListener(senderFlowName);
    bootstrap.removeCompleteListener(receiver1FlowName);
    bootstrap.removeCompleteListener(receiver2FlowName);
    bootstrap.cleanUp(workflowName, done);
  });

  function loadProcessInstances(wfInstance, callback) {
    expect(wfInstance).to.exist;
    wfInstance.processes({}, bootstrap.defaultContext, function CB(err, instances) {
      expect(err).to.not.exist;
      expect(instances).to.exist.and.be.an('array').of.length(3);
      let sender = instances.find(v => {
        return v.processDefinitionName === senderFlowName;
      });
      let receiver1 = instances.find(v => {
        return v.processDefinitionName === receiver1FlowName;
      });
      let receiver2 = instances.find(v => {
        return v.processDefinitionName === receiver2FlowName;
      });
      callback(sender, receiver1, receiver2);
    });
  }

  it('Messsage on receiver in another lane completes the flow', function testFunction(done) {
    loadProcessInstances(workflowInstance, function testFunction(senderProc, receiver1Proc, receiver2Proc) {
      stateVerifier.isRunning(senderProc);
      stateVerifier.verifyTokens(senderProc, ['Start1', 'Send1', {
        name: 'UserTask',
        status: Status.PENDING
      }]);

      stateVerifier.isComplete(receiver1Proc);
      stateVerifier.verifyTokens(receiver1Proc, ['StartR1', 'Receiver1', 'EndR1']);

      stateVerifier.isRunning(receiver2Proc);
      stateVerifier.verifyTokens(receiver2Proc, ['StartR2', {
        name: 'Receiver2',
        status: Status.PENDING
      }]);
      done();
    });
  });


  xit('Messsage on receiver in lane boundary completes the flow', function testFunction(done) {
    workflowInstance.tasks({}, bootstrap.defaultContext, function testFunction(err, tasks) {
      expect(err).to.not.exist;
      expect(tasks).to.exist.and.be.an('array').of.length(1);
      let task = tasks[0];
      expect(task.status).to.equal(Status.PENDING);
      task.complete({}, bootstrap.defaultContext, function testFunction(err, task) {
        expect(err).to.not.exist;
        expect(task.status).to.equal(Status.COMPLETE);
      });
    });

    bootstrap.onComplete(receiver2FlowName, function testFunction(err, instance) {
      expect(err).to.not.exist;
      loadProcessInstances(workflowInstance, function testFunction(senderProc, receiver1Proc, receiver2Proc) {
        stateVerifier.isComplete(senderProc);
        stateVerifier.verifyTokens(senderProc, ['Start1', 'Send1', 'UserTask', 'Send2', 'End1']);

        stateVerifier.isComplete(receiver1Proc);
        stateVerifier.verifyTokens(receiver1Proc, ['StartR1', 'Receiver1', 'EndR1']);

        stateVerifier.isComplete(receiver2Proc);
        stateVerifier.verifyTokens(receiver2Proc, ['StartR2', 'Receiver2', 'EndR2']);
        done();
      });
    });
  });
});
