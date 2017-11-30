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

var modelName = 'Product';
var prevVersion;

describe('Init for OE Connector', function cb() {
  this.timeout(10000);
  it('should create ' + modelName + ' Model', function cb(done) {
    var postData = {
      'name': modelName,
      'base': 'BaseEntity',
      'idInjection': false,
      'options': {
        'validateUpsert': true
      },
      'mixins': {},
      'properties': {
        'name': {
          'type': 'string'
        },
        'price': {
          'type': 'number'
        }
      },
      'relations': {},
      'validations': []
    };


    models.ModelDefinition.create(postData, bootstrap.defaultContext, function CB(err, res) {
      if (err) {
        done(err);
      } else {
        done();
      }
    });
  });
});

describe('Test case for OE Connector - Create [Static Props]', function CB() {
  this.timeout(10000);
  var name = 'oe-connector-create-static';
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
      setTimeout(done, 1000);
    });
  });

  it('should verify model instance creation', function CB(done) {
    models[modelName].findById('p001', bootstrap.defaultContext, function cb(err, instance) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(instance);
      assert.strictEqual(instance.name, 'himalaya');
      assert.strictEqual(instance.price, 123);
      setTimeout(done, 1000);
    });
  });
});

describe('Test case for OE Connector - Create [Dynamic Prop]', function CB() {
  this.timeout(10000);
  var name = 'oe-connector-create-dynamic-prop';
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
    var data = {
      'workflowDefinitionName': name,
      'processVariables': {
        'pname': 'colgate',
        'pprice': 1234,
        'modelName': 'Product'
      }
    };
    models.WorkflowInstance.create(data, bootstrap.defaultContext, function CB(err, instance) {
      if (err) {
        return done(err);
      }
      testVars.mainWorkflowInstance = instance;
      setTimeout(done, 2000);
    });
  });

  it('should verify model instance creation', function CB(done) {
    models[modelName].findById('p002', bootstrap.defaultContext, function cb(err, instance) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(instance);
      assert.strictEqual(instance.name, 'colgate');
      assert.strictEqual(instance.price, 1234);
      prevVersion = instance._version;
      setTimeout(done, 1000);
    });
  });
});

describe('Test case for OE Connector - Create [Dynamic Object]', function CB() {
  this.timeout(10000);
  var name = 'oe-connector-create-dynamic-object';
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
    var data = {
      'workflowDefinitionName': name,
      'processVariables': {
        'pobject': {
          'name': 'sensodyne',
          'price': 9999,
          'id': 'p003'
        }
      }
    };
    models.WorkflowInstance.create(data, bootstrap.defaultContext, function CB(err, instance) {
      if (err) {
        return done(err);
      }
      testVars.mainWorkflowInstance = instance;
      setTimeout(done, 1000);
    });
  });

  it('fetch temp definition flowObject ', function CB(done) {
    models.ProcessDefinition.findById(name, bootstrap.defaultContext, function CB(err, instance) {
      if (err) {
        return done(err);
      }
      done();
    });
  });

  it('should verify model instance creation', function CB(done) {
    models[modelName].findById('p003', bootstrap.defaultContext, function cb(err, instance) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(instance);
      assert.strictEqual(instance.name, 'sensodyne');
      assert.strictEqual(instance.price, 9999);
      setTimeout(done, 1000);
    });
  });
});

describe('Test case for OE Connector - Find', function CB() {
  this.timeout(10000);
  var name = 'oe-connector-find';
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
      setTimeout(done, 1000);
    });
  });

  it('fetch and validate process instance recieved model instance', function CB(done) {
    testVars.mainWorkflowInstance.processes({}, bootstrap.defaultContext, function CB(err, instance) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(instance);
      assert.lengthOf(instance, 1);
      var tokens = instance._processTokens;
      for (var i in tokens) {
        if (Object.prototype.hasOwnProperty.call(tokens, i)) {
          var token = tokens[i];
          if (token.name === 'End') {
            assert.isNotNull(token.message);
            assert.strictEqual(token.message.name, 'colgate');
            assert.strictEqual(token.message.price, 1234);
          }
        }
      }
      setTimeout(done, 1000);
    });
  });
});

describe('Test case for OE Connector - Update [Static]', function CB() {
  this.timeout(10000);
  var name = 'oe-connector-update-static';
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
    var data = {
      'workflowDefinitionName': name,
      'processVariables': {
        'prevVersion': prevVersion
      }
    };
    models.WorkflowInstance.create(data, bootstrap.defaultContext, function CB(err, instance) {
      if (err) {
        return done(err);
      }
      testVars.mainWorkflowInstance = instance;
      setTimeout(done, 1000);
    });
  });

  it('should verify model instance updation', function CB(done) {
    models[modelName].findById('p002', bootstrap.defaultContext, function cb(err, instance) {
      if (err) {
        return done(err);
      }
      assert.isNotNull(instance);
      assert.strictEqual(instance.name, 'pepsodent');
      assert.strictEqual(instance.price, 1234);
      prevVersion = instance._version;
      setTimeout(done, 1000);
    });
  });
});

describe('Test case for OE Connector - Delete', function CB() {
  this.timeout(10000);
  var name = 'oe-connector-delete';
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
    var data = {
      'workflowDefinitionName': name,
      'processVariables': {
        'prevVersion': prevVersion
      }
    };
    models.WorkflowInstance.create(data, bootstrap.defaultContext, function CB(err, instance) {
      if (err) {
        return done(err);
      }
      testVars.mainWorkflowInstance = instance;
      setTimeout(done, 1000);
    });
  });

  it('should verify model instance deletion', function CB(done) {
    models[modelName].findById('p002', bootstrap.defaultContext, function cb(err, instance) {
      if (err) {
        return done(err);
      }
      assert.isNull(instance);
      setTimeout(done, 1000);
    });
  });
});
