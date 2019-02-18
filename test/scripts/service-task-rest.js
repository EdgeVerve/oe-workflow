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

let stateVerifier = require('../utils/state-verifier');

describe('Rest Service Task Tests', function CB() {
  let workflowName = 'service-task-rest';
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
        httpMethod: 'GET',
        model: 'WorkflowDefinitions',
        payload: {
          prop1: 'val1',
          prop2: 'val2'
        }
      },
      message: {
        modelMethod: 'count',
        requestHeaders: {
          testheader: 'headerValue'
        }
      }
    };

    before('trigger workflow', function testFunction(done) {
      bootstrap.triggerAndComplete(workflowName, workflowPayload, function testFunction(err, wfInstance, processInstance) {
        workflowInstance = wfInstance;
        done(err);
      });
    });

    after('remove listeners', function testFunction(done) {
      bootstrap.removeTokenStatusListener(workflowName);
      bootstrap.removeCompleteListener(workflowName);
      done();
    });

    it('Rest Service node executes and completes', function CB(done) {
      expect(workflowInstance).to.exist;
      workflowInstance.processes({}, bootstrap.defaultContext, function CB(err, instances) {
        expect(err).to.not.exist;
        expect(instances).to.exist.and.be.an('array').of.length(1);
        let instance = instances[0];
        stateVerifier.isComplete(instance);
        stateVerifier.verifyTokens(instance, [{
          name: 'Start',
          status: 'complete'
        }, {
          name: 'ServiceTask',
          status: 'complete'
        }, {
          name: 'End',
          status: 'complete'
        }]);
        done();
      });
    });

    it('executes the rest call and populates response as message.body on next node', function CB(done) {
      workflowInstance.processes({}, bootstrap.defaultContext, function CB(err, instances) {
        expect(err).to.not.exist;
        expect(instances).to.exist.and.be.an('array').of.length(1);
        let instance = instances[0];
        let endToken = stateVerifier.fetchTokenByName(instance, 'End');
        expect(endToken.message).to.exist;
        expect(endToken.message.body).to.exist.and.have.property('count');
        done();
      });
    });

    it('Payload message and pv variables can be used in url, method expressions', function CB(done) {
      workflowInstance.processes({}, bootstrap.defaultContext, function CB(err, instances) {
        expect(err).to.not.exist;
        expect(instances).to.exist.and.be.an('array').of.length(1);
        let instance = instances[0];
        let endToken = stateVerifier.fetchTokenByName(instance, 'End');
        expect(endToken.message.urlOptions).to.exist;
        expect(endToken.message.urlOptions.url).to.equal('/api/' + workflowPayload.processVariables.model + '/' + workflowPayload.message.modelMethod);
        expect(endToken.message.urlOptions.method).to.equal(workflowPayload.processVariables.httpMethod);
        done();
      });
    });

    it('Payload message and pv variables can be used in header and body expressions', function CB(done) {
      workflowInstance.processes({}, bootstrap.defaultContext, function CB(err, instances) {
        expect(err).to.not.exist;
        expect(instances).to.exist.and.be.an('array').of.length(1);
        let instance = instances[0];
        let endToken = stateVerifier.fetchTokenByName(instance, 'End');
        expect(endToken.message.urlOptions).to.exist;
        expect(endToken.message.urlOptions.headers).to.deep.equal(workflowPayload.message.requestHeaders);
        expect(endToken.message.urlOptions.json).to.deep.equal(workflowPayload.processVariables.payload);
        done();
      });
    });
  });

  describe('Failure Test Suite', function CB() {
    let workflowInstance;
    /* Either payload or explicit header is required for parsing response as JSON */
    let workflowPayload = {
      processVariables: {
        httpMethod: 'GET',
        model: 'InvalidModel',
        payload: {}
      },
      message: {
        modelMethod: 'count'
      }
    };

    before('trigger workflow and wait for failure', function testFunction(done) {
      /* Simulate failure with 404 Url */
      bootstrap.triggerAndWaitForTokenStatus(workflowName, workflowPayload, 'ServiceTask', bootstrap.Status.FAILED, function testFunction(err, instance) {
        workflowInstance = instance;
        done(err);
      });
    });

    after('remove listeners', function testFunction(done) {
      bootstrap.removeTokenStatusListener(workflowName);
      bootstrap.removeCompleteListener(workflowName);
      done();
    });

    it('Rest Service failure causes workflow to stop', function CB(done) {
      workflowInstance.processes({}, bootstrap.defaultContext, function CB(err, instances) {
        expect(err).to.not.exist;
        expect(instances).to.exist.and.be.an('array').of.length(1);
        let instance = instances[0];
        /* Check for results now */
        stateVerifier.isRunning(instance);
        stateVerifier.verifyTokens(instance, [{
          name: 'Start',
          status: 'complete'
        }, {
          name: 'ServiceTask',
          status: 'failed'
        }]);
        done();
      });
    });

    it('can be fetched through ProcessInstance.failures', function CB(done) {
      models.ProcessInstance.failures({
        workflowInstanceId: workflowInstance.id
      }, bootstrap.defaultContext, function testFunction(err, data) {
        expect(err).to.not.exist;
        expect(data).to.be.an('array').of.length(1);
        expect(data[0].bpmndata).to.not.exist;
        expect(data[0].workflowInstanceId).to.deep.equal(workflowInstance.id);
        expect(data[0]._status).to.equal('running');
        done();
      });
    });

    it('Failed Rest Service task is returned by ProcessInstance.failedTokens ', function CB(done) {
      workflowInstance.processes({}, bootstrap.defaultContext, function CB(err, instances) {
        expect(err).to.not.exist;
        expect(instances).to.exist.and.be.an('array').of.length(1);
        let instance = instances[0];
        instance.failureTokens(bootstrap.defaultContext, function testFunction(err, data) {
          expect(err).to.not.exist;
          expect(data).to.be.an('array').of.length(1);
          expect(data[0].name).to.equal('ServiceTask');
          expect(data[0].status).to.equal('failed');
          /* Message remains original */
          expect(data[0].message).to.deep.equal(workflowPayload.message);
          /* Error is populated on token */
          expect(data[0].error).to.exist;
          expect(data[0].error.statusCode).to.equal(404);
          done();
        });
      });
    });

    it('Failed Rest Service task can be completed through ProcessInstance.retry', function CB(done) {
      bootstrap.onComplete(workflowName, function testFunction(err, instance) {
        expect(err).to.not.exist;
        expect(instance._status).to.equal('complete');
        let endToken = stateVerifier.fetchTokenByName(instance, 'End');
        expect(endToken.message).to.exist;
        expect(endToken.message.body).to.exist.and.have.property('count');
        done();
      });

      workflowInstance.processes({}, bootstrap.defaultContext, function CB(err, instances) {
        expect(err).to.not.exist;
        expect(instances).to.exist.and.be.an('array').of.length(1);
        let instance = instances[0];
        let scriptToken = stateVerifier.fetchTokenByName(instance, 'ServiceTask');
        instance.retry(scriptToken.id, {
          model: 'WorkflowDefinitions'
        }, bootstrap.defaultContext, function testFunction(err, instance) {
          /* Retry the failed Rest Service task */
          expect(err).to.not.exist;
          /* Done is called by complete event handler */
          // done();
        });
      });
    });
  });
});
