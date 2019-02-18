/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

let bootstrap = require('../bootstrap.js');
let chai = bootstrap.chai;
let expect = chai.expect;
let models = bootstrap.app.models;
let Status = bootstrap.Status;

let stateVerifier = require('../utils/state-verifier');

describe('Workflow versioning tests', function CB() {
  let workflowName = 'workflow-versioning';
  let task1;
  let modtask1;
  let workflowDefinition1;
  let workflowDefinition2;
  let processInstance1;
  let processInstance2;
  before('define workflow', function testFunction(done) {
    bootstrap.loadBpmnFile(workflowName + '-1', workflowName, function testFunction(err, wfDef) {
      expect(err).to.not.exist;
      workflowDefinition1 = wfDef;
      bootstrap.triggerWaitForUserTask(workflowName, {}, 'Task1', function testFunction(err, wfInst, procInst, task) {
        expect(err).to.not.exist;
        expect(task).to.exist.and.have.property('status').that.equals(Status.PENDING);
        task1 = task;

        stateVerifier.isRunning(procInst);
        stateVerifier.verifyTokens(procInst, ['Start', {
          name: 'Task1',
          status: Status.PENDING
        }]);
        processInstance1 = procInst;
        done(err);
      });
    });
  });
  after('cleanup data', function testFunction(done) {
    bootstrap.cleanUp(workflowName, done);
  });


  it('uploads the workflow as latest', function testFunction(done) {
    models.WorkflowDefinition.find({
      name: workflowName
    }, bootstrap.defaultContext, function testFunction(err, defs) {
      expect(err).to.not.exist;
      expect(defs).to.be.an('array').of.length(1);
      expect(defs[0].latest).to.be.true;
      expect(defs[0].id).to.equal(workflowDefinition1.id);
      done();
    });
  });


  it('when new version is uploaded, the current is marked latest-false', function testFunction(done) {
    bootstrap.loadBpmnFile(workflowName + '-2', workflowName, function testFunction(err, wfDef) {
      expect(err).to.not.exist;
      workflowDefinition2 = wfDef;
      models.WorkflowDefinition.find({where: {
        name: workflowName
      }}, bootstrap.defaultContext, function testFunction(err, defs) {
        expect(err).to.not.exist;
        expect(defs).to.be.an('array').of.length(2);
        if (defs[0].id === workflowDefinition1.id) {
          expect(defs[0].latest).to.be.false;
          expect(defs[1].latest).to.be.true;
          expect(defs[1].id).to.deep.equal(workflowDefinition2.id);
        } else {
          expect(defs[1].latest).to.be.false;
          expect(defs[0].latest).to.be.true;
          expect(defs[0].id).to.deep.equal(workflowDefinition2.id);
        }
        done();
      });
    });
  });

  it('next run triggers the new definition', function testFunction(done) {
    bootstrap.triggerWaitForUserTask(workflowName, {}, 'ModTask1', function testFunction(err, wfInst, procInst, task) {
      expect(err).to.not.exist;
      expect(task).to.exist;
      modtask1 = task;
      processInstance2 = procInst;
      done();
    });
  });

  it('instance on previous version follows old flow', function testFunction(done) {
    bootstrap.onComplete(workflowName, function testFunction(err, procInst) {
      expect(err).to.not.exist;
      expect(procInst).to.exist;
      expect(procInst.id).to.deep.equal(processInstance1.id);
      stateVerifier.isComplete(procInst);
      stateVerifier.verifyTokens(procInst, ['Start', 'Task1', 'End']);
      done();
    });
    task1.complete({}, bootstrap.defaultContext, function testFunction(err, task) {
      expect(err).to.not.exist;
      expect(task).to.exist.and.have.property('status').that.equals(Status.COMPLETE);
    });
  });

  it('instance on new version follows new flow', function testFunction(done) {
    bootstrap.onUserTask(workflowName, 'Task2', function testFunction(err, task, procInst) {
      expect(err).to.not.exist;
      expect(procInst).to.exist;
      expect(procInst.id).to.deep.equal(processInstance2.id);
      stateVerifier.isRunning(procInst);
      stateVerifier.verifyTokens(procInst, ['Start', 'ModTask1', {
        name: 'Task2',
        status: Status.PENDING
      }]);
      done();
    });
    modtask1.complete({}, bootstrap.defaultContext, function testFunction(err, task) {
      expect(err).to.not.exist;
      expect(task).to.exist.and.have.property('status').that.equals(Status.COMPLETE);
    });
  });
});
