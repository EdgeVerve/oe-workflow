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
let models = bootstrap.app.models;
let stateVerifier = require('../utils/state-verifier');


function populateFlow(processDefn, currentNode, privNode, allFlows) {
  let outFlows = processDefn.sequenceFlows.filter(v => v.sourceRef === currentNode.bpmnId);
  let nodeName = (privNode ? privNode.name : null);
  let nextNodeName = currentNode.name;
  if (nodeName) {
    let exists = allFlows.find(v => {
      return v.name === nodeName && v.next === nextNodeName;
    });
    !exists && allFlows.push({
      name: nodeName,
      next: nextNodeName
    });
  }
  if (outFlows.length > 0) {
    outFlows.forEach(outflow => {
      let nextNode = processDefn.flowObjects.find(v => v.bpmnId === outflow.targetRef);
      populateFlow(processDefn, nextNode, currentNode, allFlows);
    });
  } else {
    let exists = allFlows.find(v => {
      return v.name === nextNodeName && v.next === null;
    });
    !exists && allFlows.push({
      name: nextNodeName,
      next: null
    });
  }
}

function removeExtraTokens(procInst, upTo, allFlows, index) {
  let tokens = stateVerifier.fetchMatchingTokens(procInst, {
    name: upTo
  });
  if (typeof index === 'undefined') {
    index = 0;
  }

  if (tokens.length > 0) {
    let tokenToUpdate = tokens[0];
    if (tokens.length > 1) {
      tokenToUpdate = tokens[index];
    }

    tokenToUpdate.status = 'pending';
    if (tokenToUpdate.isParallel) {
      tokenToUpdate.nrOfCompleteInstances = 0;
      tokenToUpdate.nrOfActiveInstances = tokenToUpdate.nrOfInstances;
    }
  }

  let flows = allFlows.filter(v => {
    return v.name === upTo;
  });
  flows.forEach(flow => {
    if (flow.next) {
      removeExtraTokens(procInst, flow.next, allFlows, index);
      let tokens = stateVerifier.fetchMatchingTokens(procInst, {
        name: flow.next
      });

      /* If there are two matching NEXT tokens, possibly some other BRANCH is also joining there */
      /* lets remove only one of the tokens */
      if (tokens.length > 1) {
        delete procInst._processTokens[tokens[index].id];
      } else if (tokens.length > 0) {
        delete procInst._processTokens[tokens[0].id];
      }
      // tokens.forEach(token => {
      //   delete procInst._processTokens[token.id];
      // });
    }
  });
}


describe('Workflow Recovery Tests', function CB() {
  let workflowName = 'workflow-recovery-parent';
  let processInstance;
  let allFlows = {};
  let expectedTokens = ['Start', 'User101', 'Script101', 'Service101', 'Timer200', 'Sub', 'Script2', 'CallActivity101', 'MessageThrow', 'End'];
  before('define workflow', function testFunction(done) {
    /* We will receive event after recovery starts */
    this.timeout(12000);
    bootstrap.onComplete(workflowName, function cb(err, instance) {
      expect(err).to.not.exist;
      processInstance = instance;
      stateVerifier.isComplete(processInstance);
      stateVerifier.verifyTokens(processInstance, expectedTokens);
      models.MasterControl.enable('WORKFLOW-MONITOR', function enableCb(err) {
        if (err) {
          done(err);
        } else {
          bootstrap.app.once('start-workflow-monitoring', done);
        }
      });
    });
    bootstrap.loadBpmnFile('workflow-recovery-child', function cb(err, wfDef) {
      expect(err).to.not.exist;
      wfDef.processDefinitions(function cb(err, defs) {
        expect(err).to.not.exist;
        defs.forEach(data => {
          let processDefn = data.processDefinition;
          let flow = [];
          let currentNode = processDefn.flowObjects.find(v => v.isStartEvent);
          populateFlow(processDefn, currentNode, null, flow);
          allFlows[data.name] = flow;
        });

        bootstrap.loadBpmnFile(workflowName, function testFunction(err, wfDef) {
          expect(err).to.not.exist;
          wfDef.processDefinitions(function cb(err, defs) {
            expect(err).to.not.exist;
            defs.forEach(data => {
              let processDefn = data.processDefinition;
              let flow = [];
              let currentNode = processDefn.flowObjects.find(v => v.isStartEvent);
              populateFlow(processDefn, currentNode, null, flow);
              allFlows[data.name] = flow;
            });
            bootstrap.triggerWaitForUserTask(workflowName, {}, 'User101', function triggerCb(err, wfInst, procInst, task) {
              expect(err).to.not.exist;
              task.complete({}, bootstrap.defaultContext, function cb(err, task) {
                expect(err).to.not.exist;
                expect(task).to.exist.and.have.property('status').that.equals(Status.COMPLETE);
              });
            });
          });
        });
      });
    });
  });

  after('cleanup data', function testFunction(done) {
    this.timeout(15000);
    bootstrap.app.once('stop-workflow-monitoring', function cb() {
      bootstrap.cleanUp(workflowName, done);
    });
    models.MasterControl.disable('WORKFLOW-MONITOR', 'tests-completed', function cb(err, response) {
      expect(err).to.not.exist;
      expect(response).to.equal('Flagged WORKFLOW-MONITOR as disabled');
    });
  });

  function runRecoveryTest(tokenName, config, callback) {
    if (typeof callback === 'undefined' && typeof config === 'function') {
      callback = config;
      config = {index: 0};
    }
    config.index = config.index || 0;
    config.isUserTask = config.isUserTask || false;


    !config.isUserTask && bootstrap.onComplete(workflowName, function cb(err, procInst) {
      expect(err).to.not.exist;
      processInstance = procInst;
      stateVerifier.isComplete(processInstance);
      stateVerifier.verifyTokens(processInstance, expectedTokens);
      callback(null, procInst);
    });

    let procInst = processInstance.toObject();

    removeExtraTokens(procInst, tokenName, allFlows[workflowName], config.index);
    processInstance.updateAttributes({
      _status: Status.RUNNING,
      _version: processInstance._version,
      _processTokens: procInst._processTokens,
      passiveWait: config.isUserTask
    }, function cb(err, result) {
      expect(err).to.not.exist;
      processInstance = result;
      stateVerifier.isRunning(processInstance);
      let pendingTokens = stateVerifier.fetchMatchingTokens(processInstance, tokenName);
      pendingTokens.forEach(v => {
        expect(v.status).to.equal(Status.PENDING);
      });

      if (config.isUserTask) {
        callback(null, processInstance);
      }
    });
  }


  it('Recovers end token', function testFunction(done) {
    this.timeout(8000);
    runRecoveryTest('End', done);
  });

  it('Recovers message throw token', function testFunction(done) {
    this.timeout(8000);
    runRecoveryTest('MessageThrow', done);
  });


  it('Recovers CallActivity token', function testFunction(done) {
    this.timeout(8000);
    runRecoveryTest('CallActivity101', done);
  });

  it('Recovers script token', function testFunction(done) {
    this.timeout(8000);
    runRecoveryTest('Script2', done);
  });

  it('Recovers Sub Process token', function testFunction(done) {
    this.timeout(8000);
    runRecoveryTest('Sub', done);
  });


  it('Recovers timer token', function testFunction(done) {
    this.timeout(8000);
    runRecoveryTest('Timer200', done);
  });

  it('Recovers service token', function testFunction(done) {
    this.timeout(8000);
    runRecoveryTest('Service101', done);
  });

  it('Recovers parallel script token', function testFunction(done) {
    this.timeout(8000);
    runRecoveryTest('Script101', done);
  });


  it('Does NOT Recover process waiting on user-task token', function testFunction(done) {
    this.timeout(18000);
    let timeout;
    bootstrap.onComplete(workflowName, function cb(err, instance) {
      expect(err).to.not.exist;
      timeout && clearTimeout(timeout);
      done(new Error('Not expecting workflow to auto complete'));
    });
    runRecoveryTest('User101', {isUserTask: true}, function cb(err, instance) {
      expect(err).to.not.exist;
      setTimeout(function cb() {
        bootstrap.removeCompleteListener(workflowName);
        done();
      }, 8000);
    });
  });
});
