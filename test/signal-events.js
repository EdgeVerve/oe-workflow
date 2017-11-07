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
// var log = bootstrap.log();

// var stateVerifier = require('./utils/stateverifier');

describe('Test case for Intra Process Signal', function cb() {
  this.timeout(100000);
  var name = 'IntraProcessSignal';
  var testVars = {};
  it('should read the file', function cb(done) {
    fs.readFile(path.resolve('./test/bpmn-files', name + '.bpmn'), 'utf8', (err, data) => {
      testVars.xmldata = data;
      done(err);
    });
  });

  it('deploy the WorkflowDefinition', function cb(done) {
    var defData = { 'name': name, 'xmldata': testVars.xmldata };
    models.WorkflowDefinition.create(defData, bootstrap.defaultContext, function cb(err) {
      // Code for duplicate keys
      if (bootstrap.checkDuplicateKeyError(err))              {done();}          else {
        done(err);
      }
    });
  });

  it('create workflow instance ', function cb(done) {
    var data = { 'workflowDefinitionName': name };
    models.WorkflowInstance.create(data, bootstrap.defaultContext, function cb(err, instance) {
      if (err) {
        return done(err);
      }
      testVars.mainWorkflowInstance = instance;
      done();
    });
  });

  it('fetch process instance', function cb(done) {
    testVars.mainWorkflowInstance.processes({}, bootstrap.defaultContext, function cb(err, instance) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(instance);
      assert.lengthOf(instance, 1);
      testVars.processes = instance;
      setTimeout(done, 10000);
    });
  });

  it('validate process', function cb(done) {
    models.ProcessInstance.findById(testVars.processes[0].id, bootstrap.defaultContext, function cb(err, instance) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(instance);
      assert.equal(instance._status, 'complete');
      // var expectedFlow = ['Start', 'InitTask', 'GW1', 'TaskC', 'GW2', 'End'];
      // stateVerifier.verifyFlow(instance._processTokens, expectedFlow);
      setTimeout(done, 1000);
    });
  });
});

describe('Test case for Inter Process Signal', function cb() {
  this.timeout(100000);
  var wfname1 = 'InterProcessSignalCatch';
  var wfname2 = 'InterProcessSignalThrow';
  var testVars = {};

  it('should read the file - Catch', function cb(done) {
    fs.readFile(path.resolve('./test/bpmn-files', wfname1 + '.bpmn'), 'utf8', (err, data) => {
      testVars.xmlcatch = data;
      done(err);
    });
  });

  it('should read the file - Throw', function cb(done) {
    fs.readFile(path.resolve('./test/bpmn-files', wfname2 + '.bpmn'), 'utf8', (err, data) => {
      testVars.xmlthrow = data;
      done(err);
    });
  });

  it('deploy the WorkflowDefinition - Catch', function cb(done) {
    var defData = { 'name': wfname1, 'xmldata': testVars.xmlcatch };
    models.WorkflowDefinition.create(defData, bootstrap.defaultContext, function cb(err) {
      // Code for duplicate keys
      if (bootstrap.checkDuplicateKeyError(err)) {
        done();
      } else {
        done(err);
      }
    });
  });

  it('deploy the WorkflowDefinition - Throw', function cb(done) {
    var defData = { 'name': wfname2, 'xmldata': testVars.xmlthrow };
    models.WorkflowDefinition.create(defData, bootstrap.defaultContext, function cb(err) {
      // Code for duplicate keys
      if (bootstrap.checkDuplicateKeyError(err)) {
        done();
      } else {
        done(err);
      }
    });
  });

  it('create workflow instance - Catch', function cb(done) {
    var data = {
      'workflowDefinitionName': wfname1,
      'processVariables': {
        'catchcode': 101
      }
    };
    models.WorkflowInstance.create(data, bootstrap.defaultContext, function cb(err, instance) {
      if (err) {
        return done(err);
      }
      testVars.catchWorkflowInstance = instance;
      done();
    });
  });

  it('create workflow instance - Throw', function cb(done) {
    var data = {
      'workflowDefinitionName': wfname2,
      'processVariables': {
        'throwcode': 101
      }
    };
    models.WorkflowInstance.create(data, bootstrap.defaultContext, function cb(err, instance) {
      if (err) {
        return done(err);
      }
      testVars.throwWorkflowInstance = instance;
      setTimeout(done, 10000);
    });
  });

  it('fetch process instance - Catch', function cb(done) {
    testVars.catchWorkflowInstance.processes({}, bootstrap.defaultContext, function cb(err, instance) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(instance);
      assert.lengthOf(instance, 1);
      testVars.catchprocesses = instance;
      done();
    });
  });

  it('fetch process instance - Throw', function cb(done) {
    testVars.throwWorkflowInstance.processes({}, bootstrap.defaultContext, function cb(err, instance) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(instance);
      assert.lengthOf(instance, 1);
      testVars.throwprocesses = instance;
      done();
    });
  });

  it('validate process - Catch', function cb(done) {
    models.ProcessInstance.findById(testVars.catchprocesses[0].id, bootstrap.defaultContext, function cb(err, instance) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(instance);
      assert.equal(instance._status, 'complete');
      // var expectedFlow = ['Start', 'InitTask', 'GW1', 'TaskC', 'GW2', 'End'];
      // stateVerifier.verifyFlow(instance._processTokens, expectedFlow);
      setTimeout(done, 1000);
    });
  });

  it('validate process - Throw', function cb(done) {
    models.ProcessInstance.findById(testVars.throwprocesses[0].id, bootstrap.defaultContext, function cb(err, instance) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(instance);
      assert.equal(instance._status, 'complete');
      // var expectedFlow = ['Start', 'InitTask', 'GW1', 'TaskC', 'GW2', 'End'];
      // stateVerifier.verifyFlow(instance._processTokens, expectedFlow);
      setTimeout(done, 1000);
    });
  });
});

describe('Test case for Intra Process Signal [Boundary]', function cb() {
  this.timeout(100000);
  var name = 'IntraProcessSignalBoundary';
  var testVars = {};
  it('should read the file', function cb(done) {
    fs.readFile(path.resolve('./test/bpmn-files', name + '.bpmn'), 'utf8', (err, data) => {
      testVars.xmldata = data;
      done(err);
    });
  });

  it('deploy the WorkflowDefinition', function cb(done) {
    var defData = { 'name': name, 'xmldata': testVars.xmldata };
    models.WorkflowDefinition.create(defData, bootstrap.defaultContext, function cb(err) {
      // Code for duplicate keys
      if (bootstrap.checkDuplicateKeyError(err))              {done();}          else {
        done(err);
      }
    });
  });

  it('create workflow instance ', function cb(done) {
    var data = { 'workflowDefinitionName': name };
    models.WorkflowInstance.create(data, bootstrap.defaultContext, function cb(err, instance) {
      if (err) {
        return done(err);
      }
      testVars.mainWorkflowInstance = instance;
      done();
    });
  });

  it('fetch process instance', function cb(done) {
    testVars.mainWorkflowInstance.processes({}, bootstrap.defaultContext, function cb(err, instance) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(instance);
      assert.lengthOf(instance, 1);
      testVars.processes = instance;
      setTimeout(done, 10000);
    });
  });

  it('validate process', function cb(done) {
    models.ProcessInstance.findById(testVars.processes[0].id, bootstrap.defaultContext, function cb(err, instance) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(instance);
      assert.equal(instance._status, 'complete');
      // var expectedFlow = ['Start', 'InitTask', 'GW1', 'TaskC', 'GW2', 'End'];
      // stateVerifier.verifyFlow(instance._processTokens, expectedFlow);
      setTimeout(done, 1000);
    });
  });
});

describe('Test case for Intra Process Signal [Start]', function cb() {
  this.timeout(100000);
  var name = 'IntraProcessSignalStart';
  var testVars = {};
  it('should read the file', function cb(done) {
    fs.readFile(path.resolve('./test/bpmn-files', name + '.bpmn'), 'utf8', (err, data) => {
      testVars.xmldata = data;
      done(err);
    });
  });

  it('deploy the WorkflowDefinition', function cb(done) {
    var defData = { 'name': name, 'xmldata': testVars.xmldata };
    models.WorkflowDefinition.create(defData, bootstrap.defaultContext, function cb(err) {
      // Code for duplicate keys
      if (bootstrap.checkDuplicateKeyError(err))              {done();}          else {
        done(err);
      }
    });
  });

  it('create workflow instance ', function cb(done) {
    var data = { 'workflowDefinitionName': name };
    models.WorkflowInstance.create(data, bootstrap.defaultContext, function cb(err, instance) {
      if (err) {
        return done(err);
      }
      testVars.mainWorkflowInstance = instance;
      done();
    });
  });

  it('fetch process instance', function cb(done) {
    testVars.mainWorkflowInstance.processes({}, bootstrap.defaultContext, function cb(err, instance) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(instance);
      assert.lengthOf(instance, 1);
      testVars.processes = instance;
      setTimeout(done, 10000);
    });
  });

  it('validate process', function cb(done) {
    models.ProcessInstance.findById(testVars.processes[0].id, bootstrap.defaultContext, function cb(err, instance) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(instance);
      assert.equal(instance._status, 'complete');
      // var expectedFlow = ['Start', 'InitTask', 'GW1', 'TaskC', 'GW2', 'End'];
      // stateVerifier.verifyFlow(instance._processTokens, expectedFlow);
      setTimeout(done, 1000);
    });
  });
});
