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

  it('should start recovery', function cb(done) {
    var recovery = require('./../server/boot/04-workflow-recovery');
    recovery(models.ProcessInstance.app);
    // now wait for some time to recover
    setTimeout(done, 5000);
  });

  it('should fetch all 8 complete instance via app', function CB(done) {
    models.ProcessInstance.find({
      where: {
        and: [{
          processDefinitionName: name
        }, {
          _status: 'complete'
        }]
      }
    }, bootstrap.defaultContext, function fetchPendingInstance(err, instances) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(instances);
      assert.strictEqual(instances.length, 8);
      done();
    });
  });
});

describe('Test case for Workflow Recovey involving Call Activity, Timers', function CB() {
  this.timeout(15000);
  var name = 'workflow-recovery-parent';
  var callActivityName01 = 'workflow-recovery-child-3s';
  var callActivityName02 = 'workflow-recovery-child-5s';
  var testVars = {};
  it('should read the file', function CB(done) {
    fs.readFile(path.resolve('./test/bpmn-files', name + '.bpmn'), 'utf8', (err, data) => {
      testVars.xmldata = data;
      done(err);
    });
  });

  it('should read the Child Workflow Timer 3s', function CB(done) {
    fs.readFile(path.resolve('./test/bpmn-files', callActivityName01 + '.bpmn'), 'utf8', (err, data) => {
      testVars.callActivity01Data = data;
      done(err);
    });
  });

  it('should read the Child Workflow Timer 5s', function CB(done) {
    fs.readFile(path.resolve('./test/bpmn-files', callActivityName02 + '.bpmn'), 'utf8', (err, data) => {
      testVars.callActivity02Data = data;
      done(err);
    });
  });

  it('deploy the callActivity WorkflowDefinition', function CB(done) {
    var defData = { 'name': 'Child3s', 'xmldata': testVars.callActivity01Data };
    models.WorkflowDefinition.create(defData, bootstrap.defaultContext, function CB(err) {
      // Code for duplicate keys
      if (bootstrap.checkDuplicateKeyError(err)) {
        done();
      } else {
        done(err);
      }
    });
  });

  it('deploy the callActivity WorkflowDefinition', function CB(done) {
    var defData = { 'name': 'Child5s', 'xmldata': testVars.callActivity02Data };
    models.WorkflowDefinition.create(defData, bootstrap.defaultContext, function CB(err) {
      // Code for duplicate keys
      if (bootstrap.checkDuplicateKeyError(err)) {
        done();
      } else {
        done(err);
      }
    });
  });

  it('deploy the main WorkflowDefinition', function CB(done) {
    var defData = { 'name': name, 'xmldata': testVars.xmldata };
    models.WorkflowDefinition.create(defData, bootstrap.defaultContext, function CB(err) {
      // Code for duplicate keys
      if (bootstrap.checkDuplicateKeyError(err))              {done();}          else {
        done(err);
      }
    });
  });

  it('create workflow instance ', function CB(done) {
    var processVariables = { 'mainProcessV': 'testValue', 'mainProcessV2': 2 };
    var data = { 'workflowDefinitionName': name, 'processVariables': processVariables };
    models.WorkflowInstance.create(data, bootstrap.defaultContext, function CB(err, instance) {
      if (err) {
        return done(err);
      }
      testVars.mainWorkflowInstance = instance;
      setTimeout(done, 1500);
    });
  });

  it('should fetch directly from mongodb', function CB(done) {
    var url = 'mongodb://' + mongoHost + ':27017/' + dbName;
    MongoClient.connect(url, function cb(err, db) {
      if (err) {
        return done(err);
      }
      db.collection('ProcessInstance').find({
        'processDefinitionName': name
      }).toArray(function fetchFromDb(err, res) {
        if (err) {
          log.error(log.defaultContext(), err);
          return done(err);
        }
        log.debug(res);
        assert.strictEqual(res.length, 1);
        // change the id to insert
        testVars.parentInstanceId = new ObjectID();
        res[0]._id = testVars.parentInstanceId;
        testVars.partialParentInstance = res[0];
        done();
      });
    });
  });

  it('should fetch directly from mongodb', function CB(done) {
    var url = 'mongodb://' + mongoHost + ':27017/' + dbName;
    MongoClient.connect(url, function cb(err, db) {
      if (err) {
        return done(err);
      }
      db.collection('ProcessInstance').find({
        'processDefinitionName': 'Child5s'
      }).toArray(function fetchFromDb(err, res) {
        if (err) {
          log.error(log.defaultContext(), err);
          return done(err);
        }
        log.debug(res);
        assert.strictEqual(res.length, 1);
        testVars.partialChildInstance01Id = new ObjectID();
        res[0]._id = testVars.partialChildInstance01Id;
        res[0].parentProcessInstanceId = testVars.parentInstanceId;
        testVars.partialChildInstance01 = res[0];
        done();
      });
    });
  });

  it('should fetch directly from mongodb', function CB(done) {
    var url = 'mongodb://' + mongoHost + ':27017/' + dbName;
    MongoClient.connect(url, function cb(err, db) {
      if (err) {
        return done(err);
      }
      db.collection('ProcessInstance').find({
        'processDefinitionName': 'Child3s'
      }).toArray(function fetchFromDb(err, res) {
        if (err) {
          log.error(log.defaultContext(), err);
          return done(err);
        }
        log.debug(res);
        assert.strictEqual(res.length, 1);
        // change the id to insert
        testVars.partialChildInstance02Id = new ObjectID();
        res[0]._id = testVars.partialChildInstance02Id;
        res[0].parentProcessInstanceId = testVars.parentInstanceId;
        testVars.partialChildInstance02 = res[0];
        setTimeout(done, 5000);
      });
    });
  });

  it('should insert directly into mongodb', function cb(done) {
    var url = 'mongodb://' + mongoHost + ':27017/' + dbName;
    MongoClient.connect(url, function cb(err, db) {
      if (err) {
        return done(err);
      }
      db.collection('ProcessInstance').insertMany([
        testVars.partialParentInstance,
        testVars.partialChildInstance01,
        testVars.partialChildInstance02
      ], function fetchFromDb(err, res) {
        if (err) {
          log.error(err);
          return done(err);
        }
        log.debug(res);
        done();
      });
    });
  });

  it('should verify that 3 instance are in running state', function cb(done) {
    models.ProcessInstance.find({
      where: {
        and: [
          {
            _status: 'running'
          }, {
            or: [
              {
                'processDefinitionName': 'Child3s'
              }, {
                'processDefinitionName': 'Child5s'
              }, {
                'processDefinitionName': name
              }
            ]
          }
        ]
      }
    }, bootstrap.defaultContext, function cb(err, processes) {
      if (err) {
        log.error(err);
        return done(err);
      }
      assert.strictEqual(processes.length, 3);
      done();
    });
  });

  it('should start recovery', function cb(done) {
    var recovery = require('./../server/boot/04-workflow-recovery');
    recovery(models.ProcessInstance.app);
    // now wait for some time to recover
    setTimeout(done, 5000);
  });

  it('should verify that all 6 instance are in complete state', function cb(done) {
    models.ProcessInstance.find({
      where: {
        and: [
          {
            _status: 'complete'
          }, {
            or: [
              {
                'processDefinitionName': 'Child3s'
              }, {
                'processDefinitionName': 'Child5s'
              }, {
                'processDefinitionName': name
              }
            ]
          }
        ]
      }
    }, bootstrap.defaultContext, function cb(err, processes) {
      if (err) {
        log.error(err);
        return done(err);
      }
      assert.strictEqual(processes.length, 6);
      done();
    });
  });
});
