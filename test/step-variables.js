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
// var expect = chai.expect;
var models = bootstrap.models;
var log = bootstrap.log();

// var stateVerifier = require('./utils/stateverifier');

var User1Details = {
  'username': 'user1',
  'email': 'user1@oe.com',
  'password': 'user1',
  'id': 'user1'
};

describe('Initialization', function callback() {
  this.timeout(10000);
  var BaseUser = models.BaseUser;

  it('should create user - user1', function callback(done) {
    BaseUser.create(User1Details, bootstrap.defaultContext, function callback(err, users) {
      if (bootstrap.checkDuplicateKeyError(err)) {
        log.debug(users);
        done();
      } else if (err) {
        log.error(err);
        return done(err);
      } else {
        log.debug(users);
        assert.isNotNull(users);
        done();
      }
    });
  });
});

describe('Test case for Step Variables', function callback() {
  this.timeout(10000);
  var name = 'stepVariables';
  var testVars = {};
  it('should read the file', function callback(done) {
    fs.readFile(path.resolve('./test/bpmn-files', name + '.bpmn'), 'utf8', (err, data) => {
      testVars.xmldata = data;
      done(err);
    });
  });

  it('deploy the WorkflowDefinition', function callback(done) {
    var defData = { 'name': name, 'xmldata': testVars.xmldata };
    models.WorkflowDefinition.create(defData, bootstrap.defaultContext, function callback(err, res) {
      // Code for duplicate keys
      if (bootstrap.checkDuplicateKeyError(err))              {done();}          else {
        done(err);
      }
    });
  });

  it('Verify the Process Definition', function callback(done) {
    var filter = {'where': {'name': name}};
    models.ProcessDefinition.find(filter, bootstrap.defaultContext, function callback(err, res) {
      // Code for duplicate keys
      if (err)              {done(err);}          else {
        var processDefintions = res[0].processDefinition;
        var flowObjects = processDefintions.flowObjects;
        assert.lengthOf(flowObjects, 4);

        for (var flowObject of flowObjects) {
          if (flowObject.type.indexOf('Event') || flowObject.type.indexOf('event')) {
            continue;
          }
          assert.isNotNull(flowObject.inputOutputParameters);
          assert.isNotNull(flowObject.inputOutputParameters.inputParameters);
          assert.equal(flowObject.inputOutputParameters.inputParameters.input4.constructor.name, 'Array');
          assert.equal(flowObject.inputOutputParameters.inputParameters.input4.length, 3);

          assert.equal(flowObject.inputOutputParameters.inputParameters.input5.constructor.name, 'Object');
          assert.equal(Object.keys(flowObject.inputOutputParameters.inputParameters.input5).length, 2);

          assert.isNotNull(flowObject.inputOutputParameters.outputParameters);
        }
        done();
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
      setTimeout(done, 2000);
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
      setTimeout(done, 1000);
    });
  });
});

