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
var log = bootstrap.log();

var stateVerifier = require('./utils/stateverifier');

describe('Test case #1 for Message Start Event', function CB() {
  this.timeout(15000);
  var name = 'MessageStart';
  var testVars = {};
  it('should read the file', function CB(done) {
    fs.readFile(path.resolve('./test/bpmn-files', name + '.bpmn'), 'utf8', (err, data) => {
      testVars.xmldata = data;
      done(err);
    });
  });

  it('deploy the WorkflowDefinition', function CB(done) {
    var defData = { 'name': name, 'xmldata': testVars.xmldata };
    models.WorkflowDefinition.create(defData, bootstrap.defaultContext, function CB(err, def) {
      // Code for duplicate keys
      if (bootstrap.checkDuplicateKeyError(err)) {
        done();
      } else {
        done(err);
      }
    });
  });

  it('create workflow instance ', function CB(done) {
    var data = { 'workflowDefinitionName': name };
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

      // has been intentionally put
      log.debug('Build Error Debug [Both]: ', JSON.stringify(instances, null, '\t'));
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

      // has been intentionally put
      log.debug('Build Error Debug : ', JSON.stringify(instance, null, '\t'));
      var expectedFlow = [];
      if (instance.processDefinitionName === 'MessageStart$SendMessage') {
        expectedFlow = [];
        expectedFlow = ['Start P1', 'Timer', 'SendTask', 'End P1'];
      } else {
        expectedFlow = [];
        expectedFlow = ['MessageStart', 'T2', 'End P2'];
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

      // has been intentionally put
      log.debug('Build Error Debug : ', JSON.stringify(instance, null, '\t'));
      var expectedFlow = [];
      if (instance.processDefinitionName === 'MessageStart$SendMessage') {
        expectedFlow = [];
        expectedFlow = ['Start P1', 'Timer', 'SendTask', 'End P1'];
      } else {
        expectedFlow = [];
        expectedFlow = ['MessageStart', 'T2', 'End P2'];
      }
      stateVerifier.verifyFlow(instance._processTokens, expectedFlow);
      done();
    });
  });
});
