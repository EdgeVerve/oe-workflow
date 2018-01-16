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

var stateVerifier = require('./utils/state-verifier');

describe('Test case for Script Task Simple', function CB() {
  this.timeout(100000);
  var name = 'script-task-simple';
  var testVars = {};
  it('should read the file', function CB(done) {
    fs.readFile(path.resolve('./test/bpmn-files', name + '.bpmn'), 'utf8', (err, data) => {
      testVars.xmldata = data;
      done(err);
    });
  });

  it('deploy the WorkflowDefinition', function CB(done) {
    var defData = { 'name': name, 'xmldata': testVars.xmldata };
    models.WorkflowDefinition.create(defData, bootstrap.defaultContext, function CB(err) {
      // Code for duplicate keys
      if (bootstrap.checkDuplicateKeyError(err))              {done();}          else {
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
      done();
    });
  });

  it('fetch process instance', function CB(done) {
    testVars.mainWorkflowInstance.processes({}, bootstrap.defaultContext, function CB(err, instance) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(instance);
      assert.lengthOf(instance, 1);
      testVars.processes = instance;
      setTimeout(done, 1000);
    });
  });

  it('validate process', function CB(done) {
    models.ProcessInstance.findById(testVars.processes[0].id, bootstrap.defaultContext, function CB(err, instance) {
      if (err) {
        return done(err);
      }
      stateVerifier.isFailed(instance);
      stateVerifier.verifyTokens(instance, [{
        'name': 'Start',
        'status': 'complete'
      }, {
        'name': 'ScriptTask',
        'status': 'failed'
      }]);
      setTimeout(done, 1000);
    });
  });
});

