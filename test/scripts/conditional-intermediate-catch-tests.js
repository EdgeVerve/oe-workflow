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

describe('Conditional Intermediate Catch tests', function CB() {
  let workflowName = 'conditional-intermediate-catch';

  before('define workflow', function testFunction(done) {
    bootstrap.loadAndTrigger(workflowName, {}, function testFunction(err, wfDefn, wfInst) {
      expect(err).to.not.exist;
      expect(wfInst).to.exist;
      done();
    });
  });

  after('cleanup data', function testFunction(done) {
    bootstrap.cleanUp(workflowName, done);
  });

  it('Conditional Intermedaite Catch1 waiting for the condition to be satisfied', function testFunction(done) {
    bootstrap.onUserTask(workflowName, 'UserTask1', function testFunction(err, task, instance) {
      expect(err).to.not.exist;
      expect(instance).to.exist;
      stateVerifier.isRunning(instance);
      stateVerifier.verifyTokens(instance, ['Start', 'PGIn', {
      name: 'ConditionalCatch1',
      status: Status.PENDING
    }, {
      name: 'UserTask1',
      status: Status.PENDING
    }]);
    expect(instance._processVariables).to.not.have.property('test1');
    expect(instance._processVariables).to.not.have.property('test2');
    task.complete({}, bootstrap.defaultContext, function testFunction(err, task) {
      expect(err).to.not.exist;
      expect(task.status).to.equal(Status.COMPLETE);
    });
    done();
  });
  });

  it('Conditional Intermedaite Catch1 is completed and  Catch2 is waiting for the condition to be satisfied', function testFunction(done) {
    bootstrap.onUserTask(workflowName, 'UserTask2', function testFunction(err, task, instance) {
      expect(err).to.not.exist;
      expect(instance).to.exist;
      stateVerifier.isRunning(instance);
      stateVerifier.verifyTokens(instance, ['Start', 'PGIn', {
      name: 'ConditionalCatch1', 
      status: Status.COMPLETE
      }, 'UserTask1', 'ScriptTask', {
      name: 'ConditionalCatch2',
      status: Status.PENDING
    }, {
      name: 'UserTask2',
      status: Status.PENDING
    }]);
    expect(instance._processVariables).to.have.property('test1').that.equals(true);
    expect(instance._processVariables).to.not.have.property('test2');
    task.complete({
      pv: {
        test2: 'done'
      }
    }, bootstrap.defaultContext, function testFunction(err, task) {
      expect(err).to.not.exist;
      expect(task.status).to.equal(Status.COMPLETE);
    });
    done();
  });
  });

  it('Conditional Intermediate Catch2 is completed when the condition is satisfied', function testFunction(done){
    bootstrap.onComplete(workflowName, function testFunction(err, instance) {
      expect(err).to.not.exist;
      stateVerifier.isComplete(instance);
      stateVerifier.verifyTokens(instance, ['Start', 'PGIn', 'ConditionalCatch1', 'UserTask1', 'ScriptTask', 'UserTask2', {
      name:'ConditionalCatch2', 
      status: Status.COMPLETE
      }, 'PGOut', 'PGOut', 'End']);
      expect(instance._processVariables).to.have.property('test2').that.equals('done');
      done();
    });
  });

});