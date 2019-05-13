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
let async = require('async');
let stateVerifier = require('../utils/state-verifier');

describe('Sub Process Tests', function CB() {
  let workflowName = 'sub-process';
  before('define workflow', function testFunction(done) {
    bootstrap.loadBpmnFile(workflowName, function testFunction(err) {
      done(err);
    });
  });
  after('Cleanup data', function testFunction(done) {
    bootstrap.cleanUp(workflowName, done);
  });

  function loadProcessInstances(workflowInstance, callback) {
    expect(workflowInstance).to.exist;
    workflowInstance.processes({}, bootstrap.defaultContext, function CB(err, instances) {
      expect(err).to.not.exist;
      expect(instances).to.exist.and.be.an('array').of.length(2);
      let mainPI = instances.find(v => {
        return v.processDefinitionName === 'sub-process';
      });
      let subPI = instances.find(v => {
        return v.processDefinitionName === 'sub-process$Sub';
      });
      callback(mainPI, subPI);
    });
  }

  describe('Simple Tests', function CB() {
    let workflowInstance;
    let mainProcess;
    let subProcess;

    let workflowPayload = {
      processVariables: {
        mainProcessV: 'testValue',
        mainProcessV2: 2
      },
      message: {}
    };

    before('trigger workflow and wait for sub-process task', function testFunction(done) {
      bootstrap.onUserTask(workflowName + '$Sub', 'TaskA', function testFunction(err, task) {
        expect(err).to.not.exist;
        loadProcessInstances(workflowInstance, function testFunction(mainPI, subPI) {
          mainProcess = mainPI;
          subProcess = subPI;
          done();
        });
      });
      bootstrap.triggerWorkflow(workflowName, workflowPayload, function testFunction(err, wfInstance) {
        expect(err).to.not.exist;
        expect(wfInstance).to.exist;
        workflowInstance = wfInstance;
      });
    });

    after('remove listeners', function testFunction(done) {
      bootstrap.removeUserTaskListener(workflowName + '$Sub', 'TaskA');
      bootstrap.removeCompleteListener(workflowName);
      bootstrap.removeCompleteListener(workflowName + '$Sub');
      done();
    });
    it('Workflow has parent and sub process instances', function CB(done) {
      expect(workflowInstance).to.exist;
      workflowInstance.processes({}, bootstrap.defaultContext, function CB(err, instances) {
        expect(err).to.not.exist;
        expect(instances).to.exist.and.be.an('array').of.length(2);
        let names = instances.map(v => {
          return v.processDefinitionName;
        });
        expect(names).to.have.members(['sub-process', 'sub-process$Sub']);
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

    it('main process has subprocess', function callback(done) {
      mainProcess.subProcesses({}, bootstrap.defaultContext, function callback(err, instances) {
        expect(err).to.not.exist;
        expect(instances).to.exist.and.be.an('array').of.length(1);
        expect(instances[0].id).to.deep.equal(subProcess.id);
        done();
      });
    });

    it('sub process instance has main as parent', function callback(done) {
      subProcess.parentProcess({}, bootstrap.defaultContext, function callback(err, instance) {
        expect(err).to.not.exist;
        expect(instance).to.exist;
        expect(instance.id).to.deep.equal(mainProcess.id);
        done();
      });
    });

    it('sub process has no further subprocesses', function callback(done) {
      subProcess.subProcesses({}, bootstrap.defaultContext, function callback(err, instances) {
        expect(err).to.not.exist;
        expect(instances).to.exist.and.be.an('array').of.length(0);
        done();
      });
    });

    it('main process instance has no parent-ProcessVariables', function callback(done) {
      expect(mainProcess._parentProcessVariables).to.not.exist;
      done();
    });
    it('parent-PV of subprocess are same as PV of main', function testFunction(done) {
      stateVerifier.verifyPV(mainProcess, subProcess._parentProcessVariables);
      done();
    });

    it('parent process has subprocess token as pending', function testFunction(done) {
      stateVerifier.isRunning(mainProcess);
      stateVerifier.verifyTokens(mainProcess, [{
        name: 'Start',
        status: Status.COMPLETE
      },
      {
        name: 'TaskA',
        /* This is Script Task */
        status: Status.COMPLETE
      },
      {
        name: 'Sub',
        status: Status.PENDING
      }
      ]);
      done();
    });

    it('subprocess has parent-token populated', function testFunction() {
      stateVerifier.isRunning(subProcess);
      var subToken = stateVerifier.fetchTokenByName(mainProcess, 'Sub');
      expect(subProcess.parentToken).to.exist;
      expect(subProcess.parentToken.name).to.equal(subToken.name);
      expect(subProcess.parentToken.id).to.equal(subToken.id);
    });


    it('Subprocess\' user-tasks are available only through sub-process', function testFunction(done) {
      subProcess.tasks({}, bootstrap.defaultContext, function testFunction(err, tasks) {
        expect(err).to.not.exist;
        expect(tasks).to.be.an('array').of.length(2);
        mainProcess.tasks({}, bootstrap.defaultContext, function testFunction(err, tasks) {
          expect(err).to.not.exist;
          expect(tasks).to.be.an('array').of.length(0);
          done();
        });
      });
    });

    it('parent process completes only after all paths of subprocess complete', function testFunction(done) {
      bootstrap.onComplete(workflowName + '$Sub', function testFunction(err, instance) {
        expect(err).to.not.exist;
        stateVerifier.isComplete(instance);
      });

      /* Call 'done' Only on Main Workflow Complete */
      bootstrap.onComplete(workflowName, function testFunction(err, instance) {
        expect(err).to.not.exist;
        stateVerifier.isComplete(instance);
        stateVerifier.verifyTokens(instance, [{
          name: 'Start',
          status: Status.COMPLETE
        }, {
          name: 'TaskA',
          status: Status.COMPLETE
        }, {
          name: 'Sub',
          status: Status.COMPLETE
        }, {
          name: 'End',
          status: Status.COMPLETE
        }]);

        done();
      });

      let subProcessExpectedTokens = [{
        name: 'Start',
        status: Status.COMPLETE
      }, {
        name: 'Validate',
        status: Status.COMPLETE
      }, {
        name: 'TaskA',
        status: Status.PENDING
      }, {
        name: 'TaskB',
        status: Status.PENDING
      }];

      stateVerifier.verifyTokens(subProcess, subProcessExpectedTokens);
      stateVerifier.isRunning(mainProcess);
      stateVerifier.isRunning(subProcess);

      /* Completing Only 1 task will not complete Parent Flow */
      subProcess.tasks({}, bootstrap.defaultContext, function testFunction(err, tasks) {
        expect(err).to.not.exist;
        expect(tasks).to.be.an('array').of.length(2);

        tasks[0].complete({
          pv: {
            'task0': 0
          }
        }, bootstrap.defaultContext, function testFunction(err, data) {
          expect(err).to.not.exist;
          expect(data).to.exist.and.have.property('status').that.equals(Status.COMPLETE);
          loadProcessInstances(workflowInstance, function testFunction(mainPI, subPI) {
            mainProcess = mainPI;
            subProcess = subPI;
            stateVerifier.isRunning(mainProcess);
            stateVerifier.isRunning(subProcess);
            subProcessExpectedTokens.find(v => {
              return v.name === tasks[0].name;
            }).status = Status.COMPLETE;
            stateVerifier.verifyTokens(subProcess, subProcessExpectedTokens, true);
            tasks[1].complete({
              pv: {
                'task1': 1
              }
            }, bootstrap.defaultContext, function testFunction(err, data) {
              expect(err).to.not.exist;
              expect(data).to.exist.and.have.property('status').that.equals(Status.COMPLETE);
              loadProcessInstances(workflowInstance, function testFunction(mainPI, subPI) {
                mainProcess = mainPI;
                subProcess = subPI;
                subProcessExpectedTokens.find(v => {
                  return v.name === tasks[1].name;
                }).status = Status.COMPLETE;
                stateVerifier.verifyTokens(subProcess, subProcessExpectedTokens, true);

                /* Wait for Process to complete through listener */
              });
            });
          });
        });
      });
    });
  });

  describe('Terminate tests', function CB() {
    let workflowInstance;
    // let mainProcess;
    // let subProcess;

    let workflowPayload = {
      processVariables: {
        mainProcessV: 'testValue',
        mainProcessV2: 2
      },
      message: {}
    };

    before('trigger workflow and wait for sub-process task', function testFunction(done) {
      bootstrap.onUserTask(workflowName + '$Sub', 'TaskA', function testFunction(err, task) {
        expect(err).to.not.exist;
        loadProcessInstances(workflowInstance, function testFunction(mainPI, subPI) {
          // mainProcess = mainPI;
          // subProcess = subPI;
          done();
        });
      });
      bootstrap.triggerWorkflow(workflowName, workflowPayload, function testFunction(err, wfInstance) {
        expect(err).to.not.exist;
        expect(wfInstance).to.exist;
        workflowInstance = wfInstance;
      });
    });

    after('remove listeners', function testFunction(done) {
      bootstrap.removeUserTaskListener(workflowName + '$Sub', 'TaskA');
      bootstrap.removeCompleteListener(workflowName);
      bootstrap.removeCompleteListener(workflowName + '$Sub');
      done();
    });

    it('terminating the workflow, terminates main as well as subprocess', function terminateTest(done) {
      this.timeout(5000);
      expect(workflowInstance).to.exist;
      var WorkflowInstance = bootstrap.app.models.WorkflowInstance;


      async.parallel([function testFunction(cb) {
        bootstrap.onInterrupted(workflowName + '$Sub', cb);
      }, function testFunction(cb) {
        bootstrap.onInterrupted(workflowName, cb);
      }], function testFunction(err, results) {
        expect(err).to.not.exist;
        expect(results).to.be.an('array').of.length(2);
        var procInstanceChild = results[0];
        var procInstanceMain = results[1];

        stateVerifier.isInterrupted(procInstanceChild);
        stateVerifier.isInterrupted(procInstanceMain);

        done(err);
      });

      WorkflowInstance.terminate(workflowInstance.id, bootstrap.defaultContext, function terminateCb(err, message) {
        expect(err).to.not.exist;
        expect(message).to.equal('Request for workflowInstance Termination sent');
      });
    });
  });
});
