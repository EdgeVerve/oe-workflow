/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

var fs = require('fs');
var path = require('path');

var bootstrap = require('./bootstrap');
var chai = bootstrap.chai;
var assert = chai.assert;
var models = bootstrap.models;

var stateVerifier = require('./utils/stateverifier');

describe('Test case #1 for Internal Message Passing', function CB() {
  this.timeout(15000);
  var name = 'internalMessage1';
  var testVars = {};
  it('should read the file', function CB(done) {
    fs.readFile(path.resolve('./test/bpmn-files', name + '.bpmn'), 'utf8', (err, data) => {
      testVars.xmldata = data;
      done(err);
    });
  });

  it('deploy the WorkflowDefinition', function CB(done) {
    var defData = {'name': name, 'xmldata': testVars.xmldata};
    models.WorkflowDefinition.create(defData, bootstrap.defaultContext, function CB(err, def) {
      // Code for duplicate keys
      if (bootstrap.checkDuplicateKeyError(err)) {
        done();
      }			else {
        done(err);
      }
    });
  });


  it('create workflow instance ', function CB(done) {
    var data = {'workflowDefinitionName': name};
    models.WorkflowInstance.create(data, bootstrap.defaultContext, function CB(err, instance) {
      if (err) {
        return done(err);
      }
      testVars.mainWorkflowInstance = instance;
      setTimeout(done, 5000);
    });
  });

  it('fetch process instance', function CB(done) {
    testVars.mainWorkflowInstance.processes({}, bootstrap.defaultContext, function CB(err, instances) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(instances);
      assert.lengthOf(instances, 2);
      testVars.processes = instances;
      setTimeout(done, 1000);
    });
  });

  it('validate process instance of SendTask', function CB(done) {
    models.ProcessInstance.findById(testVars.processes[1].id, bootstrap.defaultContext, function CB(err, instance) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(instance);
      assert.equal(instance._status, 'complete');
      var expectedFlow = [];
      if (instance.processDefinitionName === 'internalMessage1$SendMessage') {
        expectedFlow = [];
        expectedFlow = ['Start P1', 'Timer', 'SendTask', 'End P1'];
      } else {
        expectedFlow = [];
        expectedFlow = ['Start P2', 'RecieveTask', 'End P2'];
      }
      stateVerifier.verifyFlow(instance._processTokens, expectedFlow);
      done();
    });
  });

  it('validate process instance of RecieveTask', function CB(done) {
    models.ProcessInstance.findById(testVars.processes[0].id, bootstrap.defaultContext, function CB(err, instance) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(instance);
      assert.equal(instance._status, 'complete');
      var expectedFlow = [];
      if (instance.processDefinitionName === 'internalMessage1$SendMessage') {
        expectedFlow = [];
        expectedFlow = ['Start P1', 'Timer', 'SendTask', 'End P1'];
      } else {
        expectedFlow = [];
        expectedFlow = ['Start P2', 'RecieveTask', 'End P2'];
      }
      stateVerifier.verifyFlow(instance._processTokens, expectedFlow);
      done();
    });
  });
});
