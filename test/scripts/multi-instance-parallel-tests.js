/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
let async = require('async');
let bootstrap = require('../bootstrap.js');
let chai = bootstrap.chai;
let expect = chai.expect;
let stateVerifier = require('../utils/state-verifier');
let Status = bootstrap.Status;

describe('Parallel Multi Instance Tests', function CB() {
  let workflowName = 'multi-instance-parallel';
  let childWorkflowName = 'multi-instance-parallel-child';

  function getContext(usr) {
    return {
      ctx: {
        username: usr
      }
    };
  }

  before('define workflow', function testFunction(done) {
    bootstrap.loadBpmnFile(workflowName, function testFunction(err, wfDefn) {
      expect(err).to.not.exist;
      bootstrap.loadBpmnFile(childWorkflowName, function testFunction(err, wfDefn) {
        expect(err).to.not.exist;
        done();
      });
    });
  });
  after('cleanup data', function testFunction(done) {
    bootstrap.removeCompleteListener(workflowName);
    bootstrap.removeUserTaskListener(workflowName, 'TaskColl');
    bootstrap.removeUserTaskListener(workflowName, 'Terminator');
    bootstrap.cleanUp(workflowName, done);
  });

  afterEach('remove listeners', function testFunction(done) {
    bootstrap.removeCompleteListener(workflowName);
    bootstrap.removeUserTaskListener(workflowName, 'TaskColl');
    bootstrap.removeUserTaskListener(workflowName, 'Terminator');
    done();
  });

  it('cardinality parallel script tasks', function testFunction(done) {
    let payload = {
      processVariables: {
        type: 'cardinality',
        cardinality: 5
      }
    };
    bootstrap.triggerAndComplete(workflowName, payload, function testFunction(err, wfInstance, processInstance) {
      expect(err).to.not.exist;
      stateVerifier.isComplete(processInstance);
      stateVerifier.verifyTokens(processInstance, ['Start', 'pGway', 'xMode', 'End2', 'xGway', 'ScriptxN', 'End']);
      let scriptToken = stateVerifier.fetchTokenByName(processInstance, 'ScriptxN');
      expect(scriptToken.isParallel).to.equal(true);
      expect(scriptToken.nrOfActiveInstances).to.equal(0);
      expect(scriptToken.nrOfCompleteInstances).to.equal(payload.processVariables.cardinality);
      for (let i = 0; i < payload.processVariables.cardinality; i++) {
        expect(processInstance._processVariables['outputPV' + i]).to.equal('v' + i);
      }
      done();
    });
  });

  it('cardinality parallel failure recovery', function testFunction(done) {
    let payload = {
      processVariables: {
        killerVariable: true,
        type: 'cardinality',
        cardinality: 5
      }
    };
    bootstrap.onComplete(workflowName, function completeCb(err, procInst) {
      expect(err).to.not.exist;
      stateVerifier.isComplete(procInst);
      done();
    });

    async.parallel([function end2Complete(cb) {
      bootstrap.onTokenStatus(workflowName, 'End2', Status.COMPLETE, cb);
    }, function scriptsFailed(cb) {
      let counter = 0;
      let eventName = workflowName + '-running';
      let completionHandler = function testFunction(data) {
        let delta = data.delta;
        let instance = data.instance;
        if (instance && delta && delta.tokenToFail) {
          let matchingToken = instance._processTokens[delta.tokenToFail];

          if (matchingToken) {
            expect(matchingToken.isParallel).to.equal(true);
            expect(matchingToken.name).to.equal('ScriptxN');
            expect(matchingToken.error).to.exist;
            expect(matchingToken.error.message).to.equal('Killer Variable');
            counter++;
            if (counter === 5) {
              /* Remove ourself from event-listeners */
              bootstrap.app.models.ProcessInstance.removeListener(eventName, completionHandler);
              /* And callback */
              cb(null, {
                instance: instance,
                token: matchingToken
              });
            }
          }
        }
      };
      bootstrap.app.models.ProcessInstance.on(eventName, completionHandler);
    }], function triggerRetry(err, results) {
      expect(err).to.not.exist;
      expect(results).to.be.an('array').of.length(2);
      let scriptToken = results[1].token;
      let processInstance = results[1].instance;
      expect(scriptToken).to.exist;
      expect(processInstance).to.exist;
      payload.processVariables.killerVariable = false;

      processInstance.retry(scriptToken.id, payload.processVariables, bootstrap.defaultContext, function retryCb(err, response) {
        expect(err).to.not.exist;
        expect(response).to.exist.and.have.property('emitted').that.is.true;
      });
    });

    bootstrap.triggerWorkflow(workflowName, payload, function testFunction(err, wfInstance) {
      expect(err).to.not.exist;
      expect(wfInstance).to.exist;
    });
  });

  it('collection parallel user-tasks with completion condition', function testFunction(done) {
    let workflowInstance;
    let payload = {
      processVariables: {
        type: 'collection',
        assignees: ['usr1', 'usr2', 'usr3', 'usr4']
      }
    };
    /* Any two-users completing the task */
    let eventName = workflowName + '-TaskColl';
    var taskCount = 0;
    bootstrap.app.models.Task.on(eventName, function testFunction(task, processInstance) {
      taskCount++;
      if (taskCount === 4) {
        bootstrap.removeUserTaskListener(workflowName, 'TaskColl');
        workflowInstance.tasks({}, bootstrap.defaultContext, function testFunction(err, tasks) {
          expect(err).to.not.exist;
          expect(tasks).to.exist.and.be.an('array').of.length(4);
          let actualCandidates = tasks.map(v => v.candidateUsers).reduce((a, v) => {
            return a.concat(v);
          }, []);
          expect(actualCandidates).to.have.same.members(payload.processVariables.assignees);

          let task0 = tasks[0];
          task0.complete({
            pv: {
              taskZero: 'valueZero'
            }
          }, getContext(task0.candidateUsers[0]), function testFunction(err, task) {
            expect(err).to.not.exist;
            expect(task.status).to.equal(Status.COMPLETE);
          });
          let task1 = tasks[1];
          task1.complete({
            pv: {
              taskOne: 'valueOne'
            }
          }, getContext(task1.candidateUsers[0]), function testFunction(err, task) {
            expect(err).to.not.exist;
            expect(task.status).to.equal(Status.COMPLETE);
          });

          /* Two tasks completed, based on condition (half or more) the parallel tasks should end */
        });
      }
    });

    bootstrap.onComplete(workflowName, function testFunction(err, processInstance) {
      expect(err).to.not.exist;
      bootstrap.removeUserTaskListener(workflowName, 'TaskUntil');
      stateVerifier.isComplete(processInstance);
      stateVerifier.verifyTokens(processInstance, ['Start', 'pGway', 'xMode', 'End2', 'xGway', 'TaskColl', {
        name: 'ErrorCatch2',
        status: Status.INTERRUPTED
      }, 'End']);
      expect(processInstance._processVariables.taskZero).to.equal('valueZero');
      expect(processInstance._processVariables.taskOne).to.equal('valueOne');

      let taskToken = stateVerifier.fetchTokenByName(processInstance, 'TaskColl');
      expect(taskToken.isParallel).to.equal(true);
      expect(taskToken.nrOfInstances).to.equal(4);
      expect(taskToken.nrOfActiveInstances).to.equal(2);
      expect(taskToken.nrOfCompleteInstances).to.equal(2);

      processInstance.tasks({}, bootstrap.defaultContext, function testFunction(err, tasks) {
        expect(err).to.not.exist;
        expect(tasks).to.be.an('array').of.length(4);

        let completedTasks = tasks.filter(v => v.status === Status.COMPLETE);
        let pendingTasks = tasks.filter(v => v.status === Status.PENDING);
        expect(completedTasks.length).to.equal(2);
        expect(pendingTasks.length).to.equal(2);

        /* Try completing one of the pending tasks */
        let task2 = pendingTasks[0];
        task2.complete({
          pv: {
            taskTwo: 'valueTwo'
          }
        }, getContext(task2.candidateUsers[0]), function testFunction(err, task) {
          expect(err).to.exist;
          expect(err.message).to.equal('Task already completed');
          done();
        });
      });
    });

    bootstrap.triggerWorkflow(workflowName, payload, function testFunction(err, wfInstance) {
      expect(err).to.not.exist;
      workflowInstance = wfInstance;
    });
  });

  it('collection parallel user-tasks interrupt', function testFunction(done) {
    let payload = {
      processVariables: {
        type: 'collection',
        mode: 'interrupting',
        assignees: ['usr1', 'usr2', 'usr3', 'usr4']
      }
    };


    async.parallel([
      function waitTerminator(cb) {
        bootstrap.onUserTask(workflowName, 'Terminator', function testFunction(err, task) {
          cb(err, task);
        });
      },
      function waitParallel(cb) {
        let eventName = workflowName + '-TaskColl';
        var tasks = [];
        bootstrap.app.models.Task.on(eventName, function testFunction(task, processInstance) {
          tasks.push(task);
          if (tasks.length === 4) {
            bootstrap.removeUserTaskListener(workflowName, 'TaskColl');
            cb(null, tasks);
          }
        });
      }
    ], function testFunction(err, results) {
      expect(err).to.not.exist;

      /* All Tasks are ready */
      let terminatorTask = results[0];
      expect(terminatorTask.name).to.equal('Terminator');
      expect(results[1]).to.be.an('array').of.length(4);

      /* Complete the terminator task to trigger boundary-catch and interrupt parallel tasks */
      terminatorTask.complete({}, bootstrap.defaultContext, function testFunction(err, task) {
        expect(err).to.not.exist;
        expect(task.status).to.equal(Status.COMPLETE);
        /* this should trigger the error-end-event */
      });
    });


    bootstrap.onComplete(workflowName, function testFunction(err, processInstance) {
      expect(err).to.not.exist;
      stateVerifier.isComplete(processInstance);
      stateVerifier.verifyTokens(processInstance, ['Start', 'pGway', 'xMode', 'Terminator', 'ErrorEnd', 'xGway', {
        name: 'TaskColl',
        status: Status.INTERRUPTED
      }, 'ErrorCatch2', 'End']);

      let taskToken = stateVerifier.fetchTokenByName(processInstance, 'TaskColl');
      expect(taskToken.isParallel).to.equal(true);
      expect(taskToken.status).to.equal(Status.INTERRUPTED);
      expect(taskToken.nrOfInstances).to.equal(4);
      expect(taskToken.nrOfActiveInstances).to.equal(4);
      expect(taskToken.nrOfCompleteInstances).to.equal(0);
      processInstance.tasks({}, bootstrap.defaultContext, function testFunction(err, tasks) {
        expect(err).to.not.exist;
        expect(tasks).to.be.an('array').of.length(5);

        let completedTasks = tasks.filter(v => v.status === Status.COMPLETE);
        let pendingTasks = tasks.filter(v => v.status === Status.PENDING);
        let interruptedTasks = tasks.filter(v => v.status === Status.INTERRUPTED);
        expect(completedTasks.length).to.equal(1);
        expect(pendingTasks.length).to.equal(0);
        expect(interruptedTasks.length).to.equal(4);

        /* Try completing one of the pending tasks */
        let task0 = interruptedTasks[0];
        task0.complete({}, getContext(task0.candidateUsers[0]), function testFunction(err, task) {
          expect(err).to.exist;
          expect(err.message).to.equal('Task already completed');
          done();
        });
      });
    });

    bootstrap.triggerWorkflow(workflowName, payload, function testFunction(err, wfInstance) {
      expect(err).to.not.exist;
    });
  });

  it('collection parallel sub-processes', function testFunction(done) {
    let payload = {
      processVariables: {
        type: 'subprocess',
        assignees: ['usr1', 'usr2', 'usr3', 'usr4']
      }
    };
    let eventName = workflowName + '$Sub-SubUT';
    bootstrap.app.models.Task.on(eventName, function testFunction(task, processInstance) {
      let completionPayload = {
        pv: {}
      };
      completionPayload.pv[task.candidateUsers[0]] = true;
      task.complete(completionPayload, getContext(task.candidateUsers[0]), function testFunction(err, task) {
        expect(err).to.not.exist;
        expect(task.status).to.equal(Status.COMPLETE);
      });
    });

    bootstrap.onComplete(workflowName, function testFunction(err, processInstance) {
      expect(err).to.not.exist;
      bootstrap.removeUserTaskListener(workflowName + '$Sub', 'SubUT');
      stateVerifier.isComplete(processInstance);
      stateVerifier.verifyTokens(processInstance, ['Start', 'pGway', 'xMode', 'End2', 'xGway', 'Sub', {
        name: 'ErrorCatch',
        status: Status.INTERRUPTED
      }, 'End']);
      payload.processVariables.assignees.forEach(v => {
        expect(processInstance._processVariables[v]).to.equal(true);
      });

      let pToken = stateVerifier.fetchTokenByName(processInstance, 'Sub');
      expect(pToken.isParallel).to.equal(true);
      expect(pToken.nrOfInstances).to.equal(4);
      expect(pToken.nrOfActiveInstances).to.equal(0);
      expect(pToken.nrOfCompleteInstances).to.equal(4);

      done();
    });

    bootstrap.triggerWorkflow(workflowName, payload, function testFunction(err, wfInstance) {
      expect(err).to.not.exist;
    });
  });

  it('collection parallel sub-processes interrupt', function testFunction(done) {
    let workflowInstance;
    let payload = {
      processVariables: {
        type: 'subprocess',
        mode: 'interrupting',
        assignees: ['usr1', 'usr2', 'usr3', 'usr4']
      }
    };


    async.parallel([
      function waitTerminator(cb) {
        bootstrap.onUserTask(workflowName, 'Terminator', function testFunction(err, task) {
          cb(err, task);
        });
      },
      function waitParallel(cb) {
        let eventName = workflowName + '$Sub-SubUT';
        var tasks = [];
        bootstrap.app.models.Task.on(eventName, function testFunction(task, processInstance) {
          tasks.push(task);
          if (tasks.length === 4) {
            bootstrap.removeUserTaskListener(workflowName + '$Sub', 'SubUT');
            cb(null, tasks);
          }
        });
      }
    ], function testFunction(err, results) {
      expect(err).to.not.exist;

      /* All Tasks are ready */
      let terminatorTask = results[0];
      expect(terminatorTask.name).to.equal('Terminator');
      expect(results[1]).to.be.an('array').of.length(4);

      /* Complete the terminator task to trigger boundary-catch and interrupt parallel tasks */
      terminatorTask.complete({}, bootstrap.defaultContext, function testFunction(err, task) {
        expect(err).to.not.exist;
        expect(task.status).to.equal(Status.COMPLETE);
        /* this should trigger the error-end-event */
      });
    });


    bootstrap.onComplete(workflowName, function testFunction(err, processInstance) {
      expect(err).to.not.exist;
      stateVerifier.isComplete(processInstance);
      stateVerifier.verifyTokens(processInstance, ['Start', 'pGway', 'xMode', 'Terminator', 'ErrorEnd', 'xGway', {
        name: 'Sub',
        status: Status.INTERRUPTED
      }, 'ErrorCatch', 'End']);

      let pToken = stateVerifier.fetchTokenByName(processInstance, 'Sub');
      expect(pToken.isParallel).to.equal(true);
      expect(pToken.status).to.equal(Status.INTERRUPTED);
      expect(pToken.nrOfInstances).to.equal(4);
      expect(pToken.nrOfActiveInstances).to.equal(4);
      expect(pToken.nrOfCompleteInstances).to.equal(0);

      workflowInstance.processes({}, bootstrap.defaultContext, function testFunction(err, processes) {
        expect(err).to.not.exist;
        expect(processes).to.exist.and.be.an('array').of.length(5);

        processes.filter(p => p.processDefinitionName === workflowName).forEach(p => {
          stateVerifier.isComplete(p);
        });

        processes.filter(p => p.processDefinitionName === workflowName + '$Sub').forEach(p => {
          stateVerifier.isInterrupted(p);
        });

        workflowInstance.tasks({}, bootstrap.defaultContext, function testFunction(err, tasks) {
          expect(err).to.not.exist;
          expect(tasks).to.be.an('array').of.length(5);

          let completedTasks = tasks.filter(v => v.status === Status.COMPLETE);
          let pendingTasks = tasks.filter(v => v.status === Status.PENDING);
          let interruptedTasks = tasks.filter(v => v.status === Status.INTERRUPTED);
          expect(completedTasks.length).to.equal(1);
          expect(pendingTasks.length).to.equal(0);
          expect(interruptedTasks.length).to.equal(4);

          /* Try completing one of the pending tasks */
          let task0 = interruptedTasks[0];
          task0.complete({}, getContext(task0.candidateUsers[0]), function testFunction(err, task) {
            expect(err).to.exist;
            expect(err.message).to.equal('Task already completed');
            done();
          });
        });
      });
    });

    bootstrap.triggerWorkflow(workflowName, payload, function testFunction(err, wfInstance) {
      expect(err).to.not.exist;
      workflowInstance = wfInstance;
    });
  });

  it('cardinality parallel call-activities', function testFunction(done) {
    let payload = {
      processVariables: {
        type: 'callactivity'
      }
    };
    let eventName = childWorkflowName + '-CATask';
    bootstrap.app.models.Task.on(eventName, function testFunction(task, processInstance) {
      task.complete({}, bootstrap.defaultContext, function testFunction(err, task) {
        expect(err).to.not.exist;
        expect(task.status).to.equal(Status.COMPLETE);
      });
    });

    bootstrap.onComplete(workflowName, function testFunction(err, processInstance) {
      expect(err).to.not.exist;
      bootstrap.removeUserTaskListener(childWorkflowName, 'CATask');
      stateVerifier.isComplete(processInstance);
      stateVerifier.verifyTokens(processInstance, ['Start', 'pGway', 'xMode', 'End2', 'xGway', 'CallAct', {
        name: 'ErrorCatch3',
        status: Status.INTERRUPTED
      }, 'End']);

      let pToken = stateVerifier.fetchTokenByName(processInstance, 'CallAct');
      expect(pToken.isParallel).to.equal(true);
      expect(pToken.nrOfInstances).to.equal(3);
      expect(pToken.nrOfActiveInstances).to.equal(0);
      expect(pToken.nrOfCompleteInstances).to.equal(3);

      done();
    });

    bootstrap.triggerWorkflow(workflowName, payload, function testFunction(err, wfInstance) {
      expect(err).to.not.exist;
    });
  });

  it('collection parallel sub-processes interrupt', function testFunction(done) {
    let workflowInstance;
    let payload = {
      processVariables: {
        type: 'callactivity',
        mode: 'interrupting'
      }
    };


    async.parallel([
      function waitTerminator(cb) {
        bootstrap.onUserTask(workflowName, 'Terminator', function testFunction(err, task) {
          cb(err, task);
        });
      },
      function waitParallel(cb) {
        let eventName = childWorkflowName + '-CATask';
        var tasks = [];
        bootstrap.app.models.Task.on(eventName, function testFunction(task, processInstance) {
          tasks.push(task);
          if (tasks.length === 3) {
            bootstrap.removeUserTaskListener(childWorkflowName, 'CATask');
            cb(null, tasks);
          }
        });
      }
    ], function testFunction(err, results) {
      expect(err).to.not.exist;

      /* All Tasks are ready */
      let terminatorTask = results[0];
      expect(terminatorTask.name).to.equal('Terminator');
      expect(results[1]).to.be.an('array').of.length(3);

      /* Complete the terminator task to trigger boundary-catch and interrupt parallel tasks */
      terminatorTask.complete({}, bootstrap.defaultContext, function testFunction(err, task) {
        expect(err).to.not.exist;
        expect(task.status).to.equal(Status.COMPLETE);
        /* this should trigger the error-end-event */
      });
    });


    bootstrap.onComplete(workflowName, function testFunction(err, processInstance) {
      expect(err).to.not.exist;
      stateVerifier.isComplete(processInstance);
      stateVerifier.verifyTokens(processInstance, ['Start', 'pGway', 'xMode', 'Terminator', 'ErrorEnd', 'xGway', {
        name: 'CallAct',
        status: Status.INTERRUPTED
      }, 'ErrorCatch3', 'End']);

      let pToken = stateVerifier.fetchTokenByName(processInstance, 'CallAct');
      expect(pToken.isParallel).to.equal(true);
      expect(pToken.status).to.equal(Status.INTERRUPTED);
      expect(pToken.nrOfInstances).to.equal(3);
      expect(pToken.nrOfActiveInstances).to.equal(3);
      expect(pToken.nrOfCompleteInstances).to.equal(0);

      workflowInstance.processes({}, bootstrap.defaultContext, function testFunction(err, processes) {
        expect(err).to.not.exist;
        expect(processes).to.exist.and.be.an('array').of.length(4);

        processes.filter(p => p.processDefinitionName === workflowName).forEach(p => {
          stateVerifier.isComplete(p);
        });

        processes.filter(p => p.processDefinitionName === childWorkflowName).forEach(p => {
          stateVerifier.isInterrupted(p);
        });

        workflowInstance.tasks({}, bootstrap.defaultContext, function testFunction(err, tasks) {
          expect(err).to.not.exist;
          expect(tasks).to.be.an('array').of.length(4);

          let completedTasks = tasks.filter(v => v.status === Status.COMPLETE);
          let pendingTasks = tasks.filter(v => v.status === Status.PENDING);
          let interruptedTasks = tasks.filter(v => v.status === Status.INTERRUPTED);
          expect(completedTasks.length).to.equal(1);
          expect(pendingTasks.length).to.equal(0);
          expect(interruptedTasks.length).to.equal(3);

          /* Try completing one of the pending tasks */
          let task0 = interruptedTasks[0];
          task0.complete({}, bootstrap.defaultContext, function testFunction(err, task) {
            expect(err).to.exist;
            expect(err.message).to.equal('Task already completed');
            done();
          });
        });
      });
    });

    bootstrap.triggerWorkflow(workflowName, payload, function testFunction(err, wfInstance) {
      expect(err).to.not.exist;
      workflowInstance = wfInstance;
    });
  });
});
