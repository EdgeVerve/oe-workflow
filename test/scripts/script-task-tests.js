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

describe('Script Task Tests', function CB() {
  let workflowName = 'script-task';
  before('define workflow', function testFunction(done) {
    bootstrap.loadBpmnFile(workflowName, function testFunction(err) {
      done(err);
    });
  });
  after('cleanup data', function testFunction(done) {
    bootstrap.cleanUp(workflowName, done);
  });


  describe('Simple Tests', function CB() {
    let workflowInstance;
    let workflowPayload = {
      processVariables: {
        pvVar0: 'the message',
        pvVar1: 3,
        pvVar2: 4
      },
      message: {
        text: 'the message text'
      }
    };

    before('trigger workflow', function testFunction(done) {
      bootstrap.triggerAndComplete(workflowName, workflowPayload, function testFunction(err, wfInstance, processInstance) {
        workflowInstance = wfInstance;
        done(err);
      });
    });

    after('remove listeners', function testFunction(done) {
      bootstrap.removeCompleteListener(workflowName);
      done();
    });

    it('Script node executes and completes', function CB(done) {
      expect(workflowInstance).to.exist;
      workflowInstance.processes({}, bootstrap.defaultContext, function CB(err, instances) {
        expect(err).to.not.exist;
        expect(instances).to.exist.and.be.an('array').of.length(1);
        let instance = instances[0];
        stateVerifier.isComplete(instance);
        stateVerifier.verifyTokens(instance, [{
          name: 'Start',
          status: Status.COMPLETE
        }, {
          name: 'ScriptTask',
          status: Status.COMPLETE
        }, {
          name: 'End',
          status: Status.COMPLETE
        }]);
        done();
      });
    });

    it('Payload message is available to script-node', function CB(done) {
      workflowInstance.processes({}, bootstrap.defaultContext, function CB(err, instances) {
        expect(err).to.not.exist;
        expect(instances).to.exist.and.be.an('array').of.length(1);
        let instance = instances[0];
        expect(instance._processVariables).to.exist;
        expect(instance._processVariables.inMsg).to.deep.equal(workflowPayload.message);
        done();
      });
    });

    it('Process variables can be accessed and set', function CB(done) {
      workflowInstance.processes({}, bootstrap.defaultContext, function CB(err, instances) {
        expect(err).to.not.exist;
        expect(instances).to.exist.and.be.an('array').of.length(1);
        let instance = instances[0];
        expect(instance._processVariables).to.exist;
        expect(instance._processVariables.scriptResult).to.equal(workflowPayload.processVariables.pvVar1 + workflowPayload.processVariables.pvVar2);
        done();
      });
    });

    it('Attributes can be set on instance', function CB(done) {
      workflowInstance.processes({}, bootstrap.defaultContext, function CB(err, instances) {
        expect(err).to.not.exist;
        expect(instances).to.exist.and.be.an('array').of.length(1);
        let instance = instances[0];
        expect(instance._processVariables).to.exist;
        expect(instance._processVariables._updates).to.exist.and.have.keys(['set', 'unset']);
        expect(instance._processVariables._updates.set).to.deep.equal({
          pvVar1: workflowPayload.processVariables.pvVar1,
          pvVar2: workflowPayload.processVariables.pvVar2
        });
        expect(instance._processVariables._updates.unset).to.deep.equal({
          firstName: true,
          lastName: true
        });
        expect(instance._processVariables.data).to.deep.equal({
          pvVar1: workflowPayload.processVariables.pvVar1,
          pvVar2: workflowPayload.processVariables.pvVar2
        });
        done();
      });
    });

    it('_sendMsg, sends message to next node', function CB(done) {
      workflowInstance.processes({}, bootstrap.defaultContext, function CB(err, instances) {
        expect(err).to.not.exist;
        expect(instances).to.exist.and.be.an('array').of.length(1);
        let instance = instances[0];
        let endToken = stateVerifier.fetchTokenByName(instance, 'End');
        expect(endToken.message).to.exist;
        expect(endToken.message).to.deep.equal({
          text: workflowPayload.processVariables.pvVar0.toUpperCase(),
          result: workflowPayload.processVariables.pvVar1 + workflowPayload.processVariables.pvVar2
        });
        done();
      });
    });
  });

  describe('Failure Test Suite', function CB() {
    let workflowInstance;
    let workflowPayload = {
      processVariables: {
        pvVar0: null,
        pvVar1: 3,
        pvVar2: 4
      },
      message: {
        text: 'the message text'
      }
    };

    before('trigger workflow and wait for failure', function testFunction(done) {
      /* Simulate failure for pvVar0.toUpperCase to fail */
      bootstrap.triggerAndWaitForTokenStatus(workflowName, workflowPayload, 'ScriptTask', bootstrap.Status.FAILED, function testFunction(err, instance) {
        workflowInstance = instance;
        done(err);
      });
    });

    after('remove listeners', function testFunction(done) {
      bootstrap.removeTokenStatusListener(workflowName);
      bootstrap.removeCompleteListener(workflowName);
      done();
    });

    it('Script failure causes workflow to stop', function CB(done) {
      workflowInstance.processes({}, bootstrap.defaultContext, function CB(err, instances) {
        expect(err).to.not.exist;
        expect(instances).to.exist.and.be.an('array').of.length(1);
        let instance = instances[0];
        /* Check for results now */
        stateVerifier.isRunning(instance);
        stateVerifier.verifyTokens(instance, [{
          'name': 'Start',
          'status': Status.COMPLETE
        }, {
          'name': 'ScriptTask',
          'status': Status.FAILED
        }]);
        done();
      });
    });

    it('can be fetched through ProcessInstance.failures', function CB(done) {
      models.ProcessInstance.failures({}, bootstrap.defaultContext, function testFunction(err, data) {
        expect(err).to.not.exist;
        expect(data).to.be.an('array');
        let failedInstances = data.filter(v => {
          return v.workflowInstanceId.toString() === workflowInstance.id.toString();
        });
        expect(failedInstances).to.be.an('array').of.length(1);
        expect(failedInstances[0].bpmndata).to.not.exist;
        done();
      });
    });

    it('REST: can be fetched through ProcessInstances/failures', function CB(done) {
      var url = bootstrap.basePath + '/ProcessInstances/failures';
      bootstrap.api.set('Accept', 'application/json')
        .get(url)
        .end(function testFunction(err, response) {
          expect(err).to.not.exist;
          var data = response.body;
          expect(data).to.exist.and.be.an('array');
          let failedInstances = data.filter(v => {
            return v.workflowInstanceId.toString() === workflowInstance.id.toString();
          });
          expect(failedInstances).to.be.an('array').of.length(1);
          expect(failedInstances[0].bpmndata).to.not.exist;
          done();
        });
    });

    it('Failed script task is returned by ProcessInstance.failureTokens ', function CB(done) {
      workflowInstance.processes({}, bootstrap.defaultContext, function CB(err, instances) {
        expect(err).to.not.exist;
        expect(instances).to.exist.and.be.an('array').of.length(1);
        let instance = instances[0];
        instance.failureTokens(bootstrap.defaultContext, function testFunction(err, data) {
          expect(err).to.not.exist;
          expect(data).to.be.an('array').of.length(1);
          expect(data[0].name).to.equal('ScriptTask');
          expect(data[0].status).to.equal(Status.FAILED);
          expect(data[0].error).to.exist;
          expect(data[0].error.message).to.equal('Cannot read property \'toUpperCase\' of null');
          done();
        });
      });
    });

    it('REST: Failed script task is returned by ProcessInstance/failureTokens', function CB(done) {
      workflowInstance.processes({}, bootstrap.defaultContext, function CB(err, instances) {
        expect(err).to.not.exist;
        expect(instances).to.exist.and.be.an('array').of.length(1);
        let instance = instances[0];
        var url = bootstrap.basePath + '/ProcessInstances/' + instance.id + '/failureTokens';
        bootstrap.api.set('Accept', 'application/json')
          .get(url)
          .end(function testFunction(err, response) {
            expect(err).to.not.exist;
            var data = response.body;
            expect(data).to.be.an('array').of.length(1);
            expect(data[0].name).to.equal('ScriptTask');
            expect(data[0].status).to.equal(Status.FAILED);
            expect(data[0].error).to.exist;
            expect(data[0].error.message).to.equal('Cannot read property \'toUpperCase\' of null');
            done();
          });
      });
    });

    it('Failed script task can be completed through ProcessInstance.retryAll', function CB(done) {
      bootstrap.onComplete(workflowName, function testFunction(err, inst) {
        expect(err).to.not.exist;
        expect(inst._status).to.equal(Status.COMPLETE);
        expect(inst._processVariables.pvVar0).to.equal('the message');
        expect(inst._processVariables.pvVar1).to.equal(workflowPayload.processVariables.pvVar1);
        done();
      });
      workflowInstance.processes({}, bootstrap.defaultContext, function CB(err, instances) {
        expect(err).to.not.exist;
        expect(instances).to.exist.and.be.an('array').of.length(1);
        let instance = instances[0];
        let startToken = stateVerifier.fetchTokenByName(instance, 'Start');
        instance.retry(startToken.id, {}, bootstrap.defaultContext, function testFunction(err) {
          /* Shouldn't retry the completed token */
          expect(err).to.exist;
          expect(err.message).to.equal('invalid-token-status');
          instance.retry('an-invalid-token', {}, bootstrap.defaultContext, function testFunction(err) {
            /* Shouldn't retry the invalid token */
            expect(err).to.exist;
            expect(err.message).to.equal('invalid-token-id');
            models.ProcessInstance.retryAll({}, {
              pvVar0: 'the message'
            }, bootstrap.defaultContext, function testFunction(err, instance) {
              /* Retry the failed script task */
              expect(err).to.not.exist;
              /* Done is called by complete event handler */
              // done();
            });
          });
        });
      });
    });
  });
});
