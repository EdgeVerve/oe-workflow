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

describe('OEConnector Task Tests', function CB() {
  let workflowName = 'service-task-oe-connector';
  before('define workflow', function testFunction(done) {
    bootstrap.loadBpmnDataAndFile(workflowName, function testFunction(err) {
      done(err);
    });
  });
  after('cleanup data', function testFunction(done) {
    bootstrap.cleanUp(workflowName, done);
  });


  describe('Simple Tests', function CB() {
    let personKevin;
    let workflowInstance;
    let workflowPayload = {
      processVariables: {
        method: 'create',
        model: 'Person'
      },
      message: {
        arguments: {
          name: 'John',
          dob: '1991-04-15T00:00:00.000Z'
        }
      }
    };

    before('trigger workflow', function testFunction(done) {
      bootstrap.triggerAndComplete(workflowName, workflowPayload, function testFunction(err, wfInstance, processInstance) {
        workflowInstance = wfInstance;
        done(err);
      });
    });

    after('cleanup listeners', function testFunction(done) {
      bootstrap.removeCompleteListener(workflowName);
      done();
    });
    beforeEach(function testFunction(done) {
      models.Person.create({
        name: 'Kevin',
        dob: new Date()
      }, bootstrap.defaultContext, function testFunction(err, inst) {
        personKevin = inst;
        done(err);
      });
    });

    afterEach(function testFunction(done) {
      models.Person.destroyAll({id: personKevin.id}, {}, function cb5(err5) {
        done(err5);
      });
    });

    it('oe-connector node executes and completes', function CB(done) {
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
          name: 'oeConnectorTask',
          status: 'complete'
        }, {
          name: 'End',
          status: 'complete'
        }]);
        done();
      });
    });

    it('executes the operation and populates response as message on next node', function CB(done) {
      workflowInstance.processes({}, bootstrap.defaultContext, function CB(err, instances) {
        expect(err).to.not.exist;
        expect(instances).to.exist.and.be.an('array').of.length(1);
        let instance = instances[0];
        let endToken = stateVerifier.fetchTokenByName(instance, 'End');
        expect(endToken.message).to.exist;
        expect(endToken.message.name).to.equal(workflowPayload.message.arguments.name);
        expect(endToken.message.dob).to.equal(workflowPayload.message.arguments.dob);
        done();
      });
    });

    it('can create record', function testFunction(done) {
      models.Person.find({
        where: {
          name: workflowPayload.message.arguments.name
        }
      }, function cb(err, data) {
        expect(err).to.not.exist;
        expect(data).to.exist.and.be.an('array').of.length(1);
        expect(data[0].name).to.equal(workflowPayload.message.arguments.name);
        done();
      });
    });

    it('can update record', function testFunction(done) {
      expect(personKevin.name).to.equal('Kevin');
      personKevin.name = 'Koel';
      let payload = {
        processVariables: {
          method: 'upsert',
          model: 'Person'
        },
        message: {
          arguments: [personKevin]
        }
      };
      bootstrap.triggerAndComplete(workflowName, payload, function testFunction(err, wfInstance, processInstance) {
        expect(err).to.not.exist;
        stateVerifier.isComplete(processInstance);
        models.Person.find({
          where: {
            name: {
              inq: ['Koel', 'Kevin']
            }
          }
        }, function CB(err, records) {
          expect(records).to.exist.and.be.an('array').of.length(1);
          expect(records[0].name).to.equal('Koel');
          done(err);
        });
      });
    });

    it('can find record', function testFunction(done) {
      expect(personKevin.name).to.equal('Kevin');
      let payload = {
        processVariables: {
          method: 'findById',
          model: 'Person'
        },
        message: {
          arguments: [personKevin.id]
        }
      };
      bootstrap.triggerAndComplete(workflowName, payload, function testFunction(err, wfInstance, processInstance) {
        stateVerifier.isComplete(processInstance);
        let endToken = stateVerifier.fetchTokenByName(processInstance, 'End');
        expect(endToken.message).to.exist;
        expect(endToken.message.name).to.equal(personKevin.name);
        expect(endToken.message.dob).to.equal(personKevin.dob.toISOString());
        done(err);
      });
    });

    it('can delete record', function testFunction(done) {
      let payload = {
        processVariables: {
          method: 'removeById',
          model: 'Person'
        },
        message: {
          arguments: [personKevin.id]
        }
      };
      bootstrap.triggerAndComplete(workflowName, payload, function testFunction(err, wfInstance, processInstance) {
        expect(err).to.not.exist;
        stateVerifier.isComplete(processInstance);
        models.Person.findById(personKevin.id, function CB(err, data) {
          expect(data).to.not.exist;
          done(err);
        });
      });
    });
  });

  describe('Failure Tests', function CB() {
    let workflowInstance;
    let workflowPayload = {
      processVariables: {
        method: 'createXX',
        model: 'PersonXX'
      },
      message: {
        arguments: {
          name: 'Ray',
          dob: '1991-04-15T00:00:00.000Z'
        }
      }
    };

    before('trigger workflow and wait for failure', function testFunction(done) {
      bootstrap.triggerAndWaitForTokenStatus(workflowName, workflowPayload, 'oeConnectorTask', bootstrap.Status.FAILED, function testFunction(err, instance) {
        workflowInstance = instance;
        done(err);
      });
    });


    it('OEConnector failure causes workflow to stop', function CB(done) {
      workflowInstance.processes({}, bootstrap.defaultContext, function CB(err, instances) {
        expect(err).to.not.exist;
        expect(instances).to.exist.and.be.an('array').of.length(1);
        let instance = instances[0];
        /* Check for results now */
        stateVerifier.isRunning(instance);
        stateVerifier.verifyTokens(instance, [{
          name: 'Start',
          status: Status.COMPLETE
        }, {
          name: 'oeConnectorTask',
          status: Status.FAILED
        }]);
        done();
      });
    });

    it('can be fetched through ProcessInstance.failures', function CB(done) {
      models.ProcessInstance.failures({
        bpmnData: true,
        where: {workflowInstanceId: workflowInstance.id}
      }, bootstrap.defaultContext, function testFunction(err, data) {
        expect(err).to.not.exist;
        expect(data).to.be.an('array').of.length(1);
        expect(data[0].bpmndata).to.not.exist;
        expect(data[0].workflowInstanceId).to.deep.equal(workflowInstance.id);
        expect(data[0]._status).to.equal('running');
        expect(data[0]._processTokens).to.exist;
        done();
      });
    });

    it('Failed OEConnector task is returned by ProcessInstance.failedTokens', function CB(done) {
      workflowInstance.processes({}, bootstrap.defaultContext, function CB(err, instances) {
        expect(err).to.not.exist;
        expect(instances).to.exist.and.be.an('array').of.length(1);
        let instance = instances[0];
        instance.failureTokens(bootstrap.defaultContext, function testFunction(err, data) {
          expect(err).to.not.exist;
          expect(data).to.be.an('array').of.length(1);
          var token = data[0];
          expect(token.name).to.equal('oeConnectorTask');
          expect(token.status).to.equal('failed');
          expect(token.error).to.exist;
          expect(token.error.message).to.equal('Model not found: ' + workflowPayload.processVariables.model);
          done();
        });
      });
    });

    it('Retry with invalid method name, still causes failure', function CB(done) {
      let newPV = {
        method: 'createXX',
        model: 'Person'
      };
      bootstrap.onTokenStatus(workflowName, 'oeConnectorTask', Status.FAILED, function testFunction(err, instance, failingToken) {
        expect(err).to.not.exist;
        stateVerifier.isRunning(instance);
        expect(failingToken.name).to.equal('oeConnectorTask');
        expect(failingToken.status).to.equal(Status.FAILED);
        expect(failingToken.error).to.exist;
        expect(failingToken.error.message).to.equal('Invalid operation ' + newPV.method + ' on model ' + newPV.model);
        done();
      });

      workflowInstance.processes({}, bootstrap.defaultContext, function CB(err, instances) {
        expect(err).to.not.exist;
        expect(instances).to.exist.and.be.an('array').of.length(1);
        let instance = instances[0];
        let scriptToken = stateVerifier.fetchTokenByName(instance, 'oeConnectorTask');
        instance.retry(scriptToken.id, newPV, bootstrap.defaultContext, function testFunction(err, instance) {
          /* Retry the failed OEConnector task */
          expect(err).to.not.exist;
          /* Done is called by complete event handler */
          // done();
        });
      });
    });

    it('Retry with valid data completes the workflow', function CB(done) {
      bootstrap.onComplete(workflowName, function testFunction(err, instance) {
        expect(err).to.not.exist;
        stateVerifier.isComplete(instance);
        done();
      });

      workflowInstance.processes({}, bootstrap.defaultContext, function CB(err, instances) {
        expect(err).to.not.exist;
        expect(instances).to.exist.and.be.an('array').of.length(1);
        let instance = instances[0];
        let scriptToken = stateVerifier.fetchTokenByName(instance, 'oeConnectorTask');
        instance.retry(scriptToken.id, {
          method: 'create',
          model: 'Person'
        }, bootstrap.defaultContext, function testFunction(err, instance) {
          /* Retry the failed OEConnector task */
          expect(err).to.not.exist;
          /* Done is called by complete event handler */
          // done();
        });
      });
    });
  });
});
