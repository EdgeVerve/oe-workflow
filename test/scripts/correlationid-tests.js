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
let workflowInstance;
let processInstance;
let userTask;

describe('correlationid property should exists on models', function testfunction(done) {
  it('correlationid should exist on workflowInstance model', function testfunction(done) {
    var workflowInstance = models.WorkflowInstance;
    expect(workflowInstance.definition.properties.correlationId).to.exist;
    done();
  });

  it('correlationid should exist on task model', function testfunction(done) {
    var task = models.Task;
    expect(task.definition.properties.correlationId).to.exist;
    done();
  });

  it('correlationid should exist on processInstance model', function testfunction(done) {
    var processInstance = models.ProcessInstance;
    expect(processInstance.definition.properties.correlationId).to.exist;
    done();
  });

  it('correlationid should exist on changeworkflowRequest model', function testfunction(done) {
    var changeWorkflowRequest = models.ChangeWorkflowRequest;
    expect(changeWorkflowRequest.definition.properties.correlationId).to.exist;
    done();
  });
});

describe('correlationid should be populated on instances', function testFunction() {
  var workflowName = 'correlationid';
  let workflowPayload = {
    correlationId: 'abcdedf'
  };

  before(function testFunction(done) {
    bootstrap.loadBpmnFile(workflowName, function testFunction(err) {
      expect(err).to.not.exist;
      bootstrap.triggerWaitForUserTask(workflowName, workflowPayload, 'UserTask', function testFunction(err, wfInst, procInstance, task) {
        workflowInstance = wfInst;
        processInstance = procInstance;
        userTask = task;
        done(err);
      });
    });
  });

  after(function testFunction(done) {
    bootstrap.cleanUp(workflowName, done);
    processInstance = null;
    userTask = null;
    bootstrap.removeCompleteListener(workflowName);
    bootstrap.removeUserTaskListener(workflowName, 'UserTask');
  });

  it('correlationid should be populated on workflowInstance', function testFunction(done) {
    expect(workflowInstance).to.exist;
    expect(workflowInstance.correlationId).to.exist;
    done();
  });

  it('correlationid should be populated on processInstance', function testFunction(done) {
    expect(processInstance).to.exist;
    expect(processInstance.correlationId).to.exist;
    expect(processInstance.correlationId).to.equal(workflowInstance.correlationId);
    done();
  });

  it('correlationid should be populated on usertask', function testFunction(done) {
    expect(userTask).to.exist;
    expect(userTask.correlationId).to.exist;
    expect(userTask.correlationId).to.equal(workflowInstance.correlationId);
    done();
  });
});
