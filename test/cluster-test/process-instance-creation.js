/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

var fs = require('fs');
var path = require('path');

var bootstrap = require('../bootstrap');
var chai = bootstrap.chai;
var assert = chai.assert;
var models = bootstrap.models;
var log = bootstrap.log();

var MongoClient = require('mongodb').MongoClient;
var mongoHost = process.env.MONGO_HOST || 'localhost';
var dbName = process.env.DB_NAME || 'commondb';
var ObjectID = require('mongodb').ObjectID;

describe('Test case for Workflow Recovery', function CB() {
  this.timeout(100000);
  // var name = 'loop-workaround';
  var name = 'workflow-recovery';
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
      setTimeout(done, 2000);
    });
  });

  it('fetch process instance', function CB(done) {
    testVars.mainWorkflowInstance.processes({}, bootstrap.defaultContext, function CB(err, instance) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(instance);
      assert.lengthOf(instance, 1);
      testVars.process = instance[0];
      log.debug(instance);
      setTimeout(done, 1000);
    });
  });

  it('should fetch directly from mongodb', function CB(done) {
    var url = 'mongodb://' + mongoHost + ':27017/' + dbName;
    MongoClient.connect(url, function cb(err, db) {
      if (err) {
        return done(err);
      }
      db.collection('ProcessInstanceHistory').find({
        _modelId: testVars.process.id
      }).toArray(function fetchFromDb(err, res) {
        if (err) {
          log.error(log.defaultContext(), err);
          return done(err);
        }
        log.debug(res);
        testVars.partialInstances = res.map(function convert(instance) {
          delete instance._modelId;
          return instance;
        }).filter(function filter(instance) {
          return Object.keys(instance._processTokens).length > 1;
        });
        assert.strictEqual(testVars.partialInstances.length, 7);
        done();
      });
    });
  });

  it('should insert directly into mongodb', function cb(done) {
    var url = 'mongodb://' + mongoHost + ':27017/' + dbName;
    MongoClient.connect(url, function cb(err, db) {
      if (err) {
        return done(err);
      }
      db.collection('ProcessInstance').insertMany(testVars.partialInstances, function fetchFromDb(err, res) {
        if (err) {
          log.error(log.defaultContext(), err);
          return done(err);
        }
        log.debug(res);
        done();
      });
    });
  });

  it('should fetch 7 pending instances via app', function CB(done) {
    models.ProcessInstance.find({
      where: {
        and: [{
          processDefinitionName: name
        }, {
          _status: 'running'
        }]
      }
    }, bootstrap.defaultContext, function fetchPendingInstance(err, instances) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(instances);
      assert.strictEqual(instances.length, 7);
      done();
    });
  });
});
