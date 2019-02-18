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

describe('Sequential Multi Instance Tests', function CB() {
  let workflowName = 'multi-instance-sequential';

  before('define workflow', function testFunction(done) {
    bootstrap.loadBpmnFile(workflowName, function testFunction(err, wfDefn) {
      expect(err).to.not.exist;
      done();
    });
  });
  after('cleanup data', function testFunction(done) {
    bootstrap.removeCompleteListener(workflowName);
    bootstrap.removeUserTaskListener(workflowName, 'TaskUntil');
    bootstrap.cleanUp(workflowName, done);
  });

  it('cardinality iteration', function testFunction(done) {
    let payload = {
      processVariables: {
        type: 'cardinality',
        cardinality: 5
      }
    };
    bootstrap.triggerAndComplete(workflowName, payload, function testFunction(err, wfInstance, processInstance) {
      expect(err).to.not.exist;
      stateVerifier.isComplete(processInstance);
      stateVerifier.verifyTokens(processInstance, ['Start', 'xGway', 'ScriptxN', 'End']);
      let scriptToken = stateVerifier.fetchTokenByName(processInstance, 'ScriptxN');
      expect(scriptToken.isSequential).to.equal(true);
      expect(scriptToken.nrOfActiveInstances).to.equal(0);
      expect(scriptToken.nrOfCompleteInstances).to.equal(payload.processVariables.cardinality);
      expect(processInstance._processVariables.outputPV).to.equal('_1_2_3_4_5_');
      done();
    });
  });

  it('collection iteration', function testFunction(done) {
    let payload = {
      processVariables: {
        type: 'collection',
        collection: ['a', 'b', 'c']
      }
    };
    bootstrap.triggerAndComplete(workflowName, payload, function testFunction(err, wfInstance, processInstance) {
      expect(err).to.not.exist;
      stateVerifier.isComplete(processInstance);
      stateVerifier.verifyTokens(processInstance, ['Start', 'xGway', 'ScriptForEach', 'End']);
      let scriptToken = stateVerifier.fetchTokenByName(processInstance, 'ScriptForEach');
      expect(scriptToken.isSequential).to.equal(true);
      expect(scriptToken.nrOfActiveInstances).to.equal(0);
      expect(scriptToken.nrOfCompleteInstances).to.equal(payload.processVariables.collection.length);
      expect(processInstance._processVariables.outputPV).to.equal('_a1_b2_c3_');
      done();
    });
  });

  it('condition iteration user-task', function testFunction(done) {
    let payload = {
      processVariables: {
        outputVar: 1,
        type: 'conditional'
      }
    };


    let eventName = workflowName + '-TaskUntil';
    bootstrap.app.models.Task.on(eventName, function testFunction(task, processInstance) {
      var outputVar = processInstance._processVariables.outputVar;
      outputVar++;
      task.complete({
        pv: {
          outputVar: outputVar
        }
      }, bootstrap.defaultContext, function testFunction(err, task) {
        expect(err).to.not.exist;
        expect(task.status).to.equal(Status.COMPLETE);
      });
    });

    bootstrap.triggerWorkflow(workflowName, payload, function testFunction(err, wfInstance) {
      expect(err).to.not.exist;
    });

    bootstrap.onComplete(workflowName, function testFunction(err, processInstance) {
      expect(err).to.not.exist;
      bootstrap.removeUserTaskListener(workflowName, 'TaskUntil');
      stateVerifier.isComplete(processInstance);
      stateVerifier.verifyTokens(processInstance, ['Start', 'xGway', 'TaskUntil', 'End']);
      expect(processInstance._processVariables.outputVar).to.equal(5);

      let taskToken = stateVerifier.fetchTokenByName(processInstance, 'TaskUntil');
      expect(taskToken.isSequential).to.equal(true);

      processInstance.tasks({}, bootstrap.defaultContext, function testFunction(err, tasks) {
        expect(err).to.not.exist;
        expect(tasks).to.be.an('array').of.length(4);
        done();
      });
    });
  });
});
