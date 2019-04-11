/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

let bootstrap = require("../bootstrap.js");
let chai = bootstrap.chai;
let expect = chai.expect;
let models = bootstrap.app.models;

describe('correlationId property should exists on models', function testfunction(done) {
  it('correlationId should exist on workflowInstance model', function testfunction(done) {
    var workflowInstance = models.WorkflowInstance;
    expect(workflowInstance.definition.properties.correlationId).to.exist;
    done();
  });

  it('correlationId should exist on task model', function (done) {
    var task = models.Task;
    expect(task.definition.properties.correlationId).to.exist;
    done();
  });

  it('correlationId should exist on processInstance model', function testfunction(done) {
    var processInstance = models.ProcessInstance;
    expect(processInstance.definition.properties.correlationId).to.exist;
    done();
  });

  it('correlationId should exist on changeworkflowRequest model', function testfunction(done) {
    var changeWorkflowRequest = models.ChangeWorkflowRequest;
    expect(changeWorkflowRequest.definition.properties.correlationId).to.exist;
    done();
  });
});

describe('correlationid tests', function callback() {
  var workflowName = 'correlationid';
  before('define workflow', function testFunction(done) {
    bootstrap.loadBpmnFile(workflowName, function testFunction(err) {
      expect(err).to.not.exist;
      done(err);
    });
  });

  after('cleanup data', function testFunction(done) {
    bootstrap.cleanUp(workflowName, done);
  });
  
  describe('correlationid should be populated on instances', function testFunction() {
    let workflowInstance;
    let processInstance;
    let userTask;
    let workflowPayload = {
      processVariables: {
        cUsers: 'user1, user3',
        eUsers: 'user2'
      },
      message: {}
    };
    before(function testFunction(done) {
      bootstrap.triggerWaitForUserTask(workflowName, workflowPayload, 'UserTask', function testFunction(err, wfInst, procInstance, task) {
        workflowInstance=wfInst;
        processInstance = procInstance;
        userTask = task;
        done(err);
      });
    });
    after(function testFunction() {
      processInstance = null;
      userTask = null;
      bootstrap.removeCompleteListener(workflowName);
      bootstrap.removeUserTaskListener(workflowName, 'UserTask');
    });

    it('correlationid should be populated on workflowInstance', function testFunction(done){
      expect(workflowInstance).to.exist;
      expect(workflowInstance.correlationId).to.exist;
      done();
    });

    it('correlationid should be populated on processInstance',function testFunction(done){
      expect(processInstance).to.exist;
      expect(processInstance.correlationId).to.exist;
      expect(processInstance.correlationId).to.equal(workflowInstance.correlationId);
      done();
    });

    it('correlationid should be populated on usertask',function testFunction(done){
      expect(userTask).to.exist;
      expect(userTask.correlationId).to.exist;
      done();
    });

  });
});

