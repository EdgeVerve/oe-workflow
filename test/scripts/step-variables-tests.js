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


describe('Step Variables Tests', function CB() {
  let workflowName = 'step-variables';
  let workflowDefn;
  let userTask;
  before('define workflow', function testFunction(done) {
    bootstrap.loadBpmnFile(workflowName, function testFunction(err, wfDef) {
      expect(err).to.not.exist;
      workflowDefn = wfDef;
      bootstrap.triggerWaitForUserTask(workflowName, {}, 'UserTask', function testFunction(err, wfInstance, procInst, task) {
        userTask = task;
        done(err);
      });
    });
  });
  after('cleanup data', function testFunction(done) {
    bootstrap.removeCompleteListener(workflowName);
    bootstrap.removeUserTaskListener(workflowName, 'UserTask');
    bootstrap.cleanUp(workflowName, done);
  });

  it('Step Variables are parsed and populated in definition', function testFunction(done) {
    expect(workflowDefn).to.exist;

    workflowDefn.processDefinitions({}, bootstrap.defaultContext, function testFunction(err, processDefns) {
      expect(err).to.not.exist;
      expect(processDefns).to.exist.and.be.an('array').of.length(1);
      let flowObjects = processDefns[0].processDefinition.flowObjects;
      expect(flowObjects).to.exist.and.be.an('array').of.length(4);

      let scriptTask = flowObjects.find(v => v.name === 'ScriptTask');
      expect(scriptTask).to.exist;
      expect(scriptTask.inputOutputParameters).to.exist.and.be.an('object');
      expect(scriptTask.inputOutputParameters.inputParameters).to.exist.and.be.an('object');
      expect(scriptTask.inputOutputParameters.outputParameters).to.exist.and.be.an('object');
      expect(scriptTask.inputOutputParameters.inputParameters).to.deep.equal({
        scrInput1: 'output1',
        scrInput2: '${300*8+9*(90+99)}',
        scrInput3: ['1', 'awesome'],
        scrInput4: {
          key1: 'val1',
          key2: 'val2'
        }
      });
      expect(scriptTask.inputOutputParameters.outputParameters).to.deep.equal({
        scrOutputText: 'scrOutputTextVal'
      });

      let userTask = flowObjects.find(v => v.name === 'UserTask');
      expect(userTask).to.exist;
      expect(userTask.inputOutputParameters).to.exist.and.be.an('object');
      expect(userTask.inputOutputParameters.inputParameters).to.exist.and.be.an('object');
      expect(userTask.inputOutputParameters.outputParameters).to.exist.and.be.an('object');
      expect(userTask.inputOutputParameters.inputParameters).to.deep.equal({
        usrInput1: 'output1',
        usrInput2: '${300*8+9*(90+99)}',
        usrInput3: ['1', 'awesome'],
        usrInput4: {
          key1: 'val1',
          key2: 'val2'
        }
      });
      expect(userTask.inputOutputParameters.outputParameters).to.deep.equal({
        usrOutput: ['5', '6']
      });

      done();
    });
  });


  it('step variables are populated as message on script-task', function testFunction(done) {
    /* Script Task simply forwards the current message object as sendMsg(msg)
     * Hence, check on user-task message */
    expect(userTask).to.exist;
    expect(userTask.message).to.exist;
    expect(userTask.message.scrInput1).to.equal('output1');
    expect(userTask.message.scrInput2).to.equal(4101);
    expect(userTask.message.scrInput3).to.deep.equal(['1', 'awesome']);
    expect(userTask.message.scrInput4).to.deep.equal({
      key1: 'val1',
      key2: 'val2'
    });
    expect(userTask.message.scrOutputText).to.deep.equal('scrOutputTextVal');
    done();
  });

  it('step variables are populated as message on user-task', function testFunction(done) {
    expect(userTask).to.exist;
    expect(userTask.message).to.exist;
    expect(userTask.message.usrInput1).to.equal('output1');
    expect(userTask.message.usrInput2).to.equal(4101);
    expect(userTask.message.usrInput3).to.deep.equal(['1', 'awesome']);
    expect(userTask.message.usrInput4).to.deep.equal({
      key1: 'val1',
      key2: 'val2'
    });
    expect(userTask.message.usrOutput).to.not.exist;
    done();
  });

  it('workflow completes', function testFunction(done) {
    expect(userTask).to.exist;
    // when user task completes output parameters are populated as message on task
    userTask.complete({}, bootstrap.defaultContext, function testFunction(err, task) {
      expect(err).to.not.exist;
      expect(task.status).to.equal(Status.COMPLETE);
      expect(task.message.usrOutput).to.deep.equal(['5', '6']);
      done();
    });
  });
});
