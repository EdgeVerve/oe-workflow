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

// var stateVerifier = require('./utils/stateverifier');

describe('Test case for ParallelGateway1', function callback() {
  this.timeout(100000);
  var name = 'ParallelGateway1';
  var testVars = {};
  it('should read the file', function callback(done) {
    fs.readFile(path.resolve('./test/bpmn-files', name + '.bpmn'), 'utf8', (err, data) => {
      testVars.xmldata = data;
      done(err);
    });
  });

  it('deploy the WorkflowDefinition', function callback(done) {
    var defData = { 'name': name, 'xmldata': testVars.xmldata };
    models.WorkflowDefinition.create(defData, bootstrap.defaultContext, function callback(err) {
      // Code for duplicate keys
      if (bootstrap.checkDuplicateKeyError(err)) {
        done();
      } else {
        done(err);
      }
    });
  });

  it('create workflow instance ', function callback(done) {
    var data = { 'workflowDefinitionName': name };
    models.WorkflowInstance.create(data, bootstrap.defaultContext, function callback(err, instance) {
      if (err) {
        return done(err);
      }
      testVars.mainWorkflowInstance = instance;
      done();
    });
  });

  it('fetch process instance', function callback(done) {
    testVars.mainWorkflowInstance.processes({}, bootstrap.defaultContext, function callback(err, instance) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(instance);
      assert.lengthOf(instance, 1);
      testVars.processes = instance;
      setTimeout(done, 5000);
    });
  });

  it('validate process', function callback(done) {
    models.ProcessInstance.findById(testVars.processes[0].id, bootstrap.defaultContext, function callback(err, instance) {
      if (err) {
        return done(err);
      }
      log.debug(instance);
      assert.isNotNull(instance);
      assert.equal(instance._status, 'complete');
      // TODO : write new verification function that just verifies the tokens are present , dont care about order
      // var expectedFlow = ['Start', 'PG1', 'TaskA', 'TaskB', 'PG2', 'PG2', 'End'];
      // stateVerifier.verifyFlow(instance._processTokens, expectedFlow);
      done();
    });
  });
});

describe('Test case for ParallelGateway -5Way', function callback() {
  this.timeout(10000000);
  var name = 'ParallelGateway5Way';
  var testVars = {};
  it('should read the file', function callback(done) {
    fs.readFile(path.resolve('./test/bpmn-files', name + '.bpmn'), 'utf8', (err, data) => {
      testVars.xmldata = data;
      done(err);
    });
  });

  it('deploy the WorkflowDefinition', function callback(done) {
    var defData = { 'name': name, 'xmldata': testVars.xmldata };
    models.WorkflowDefinition.create(defData, bootstrap.defaultContext, function callback(err) {
      // Code for duplicate keys
      if (bootstrap.checkDuplicateKeyError(err)) {
        done();
      } else {
        done(err);
      }
    });
  });

  it('create workflow instance ', function callback(done) {
    var data = { 'workflowDefinitionName': name };
    models.WorkflowInstance.create(data, bootstrap.defaultContext, function callback(err, instance) {
      if (err) {
        return done(err);
      }
      testVars.mainWorkflowInstance = instance;
      done();
    });
  });

  it('fetch process instance', function callback(done) {
    testVars.mainWorkflowInstance.processes({}, bootstrap.defaultContext, function callback(err, instance) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(instance);
      assert.lengthOf(instance, 1);
      testVars.processes = instance;
      setTimeout(done, 10000);
    });
  });

  it('validate process', function callback(done) {
    models.ProcessInstance.findById(testVars.processes[0].id, bootstrap.defaultContext, function callback(err, instance) {
      if (err) {
        return done(err);
      }
      log.debug(instance);
      // TODO : write new verification function that just verifies the tokens are present , dont care about order
      assert.isNotNull(instance);
      assert.equal(instance._status, 'complete');
      done();
    });
  });
});
