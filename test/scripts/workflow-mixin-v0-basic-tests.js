let bootstrap = require('../bootstrap.js');
let chai = bootstrap.chai;
let expect = chai.expect;
let OrderV0 = bootstrap.app.models.OrderV0;
let WorkflowManager = bootstrap.app.models.WorkflowManager;
let models = bootstrap.app.models;
let async = require('async');

describe('Workflow mixin V0 Tests', function CB() {
  let workflowName = 'workflow-mixin-v0';
  var accessToken = '';
  before('setup', function testFunction(done) {
    async.series([function testFunction(cb) {
      bootstrap.loadBpmnFile(workflowName, function testFunction(err, wfDefn) {
        expect(err).to.not.exist;
        expect(wfDefn).to.exist;
        cb();
      });
    }, function testFunction(cb) {
      var userData = {
        'username': 'admin',
        'password': 'admin'
      };
      bootstrap.login(userData, function testFunction(err, at) {
        if (err) {
          cb(err);
        }
        accessToken = at;
        cb();
      });
    }], function testFunction(err, results) {
      done(err);
    });
  });

  after('cleanup', function testFunction(done) {
    bootstrap.cleanUp(workflowName, done);
  });

  describe('Create operation(POST)', function testFunction() {
    let workflowMapping;
    let workflowInstance;
    let orderRecord = {
      buyer: 'Julia',
      quantity: 1111
    };
    before('attach workflow', function testFunction(done) {
      WorkflowManager.attachWorkflow({
        operation: 'create',
        modelName: 'OrderV0',
        version: 'v0',
        workflowBody: {
          workflowDefinitionName: workflowName
        }
      }, bootstrap.defaultContext, function testFunction(err, mappings) {
        expect(err).to.not.exist;
        expect(mappings).to.exist;
        expect(mappings.mappings).to.exist.and.be.an('array').of.length(1);
        workflowMapping = mappings.mappings[0];
        done();
      });
    });

    after('cleanup', function testFunction(done) {
      async.series([
        function testFunction(callback) {
          models.WorkflowInstance.destroyAll({}, callback);
        },
        function testFunction(callback) {
          models.ProcessInstance.destroyAll({}, callback);
        },
        function testFunction(callback) {
          models.Task.destroyAll({}, callback);
        },
        function testFunction(callback) {
          models.OrderV0.destroyAll({}, callback);
        },
        function testFunction(callback) {
          WorkflowManager.detachWorkflowWithVersion(workflowMapping.id, workflowMapping._version, bootstrap.defaultContext, function testFunction(err) {
            expect(err).to.not.exist;
            OrderV0.destroyAll({}, callback);
          });
        }
      ], function testFunction(err, results) {
        done(err);
      });
    });

    it('Check for workflow mixin API methods', function testFunction(done) {
      OrderV0 = bootstrap.loopback.getModel('OrderV0');
      expect(OrderV0).to.have.a.property('workflow').that.is.a('function');
      expect(OrderV0).to.have.a.property('tasks').that.is.a('function');
      done();
    });

    it('POST on model ', function testFunction(done) {
      bootstrap.onTokenStatus(workflowName, 'start', 'complete', function testFunction(err, instance) {
        return done(err);
      });
      var url = bootstrap.basePath + '/OrderV0s?access_token=' + accessToken;
      bootstrap.api.post(url)
        .send(orderRecord)
        .set('Accept', 'application/json')
        .end(function testFunction(err, res) {
          if (err) {
            return done(err);
          }
          orderRecord = res.body;
        });
    });

    it('creates record immediately', function testFunction(done) {
      OrderV0.find({}, bootstrap.defaultContext, function testFunction(err, records) {
        expect(err).to.not.exist;
        expect(records).to.be.an('array').of.length(1);
        done();
      });
    });

    it('Triggers a workflow attached to model for create operation', function testFunction(done) {
      models.WorkflowInstance.find({ where: { correlationId: orderRecord.id } }, bootstrap.defaultContext, function testFunction(err, wfInst) {
        expect(err).to.not.exist;
        expect(wfInst).to.exist.and.be.an('array').of.length(1);
        workflowInstance = wfInst[0];
        done();
      });
    });

    it('model.workflow returns the workflow', function testFunction(done) {
      expect(orderRecord).to.exist;
      OrderV0.workflow(orderRecord.id, bootstrap.defaultContext, function testFunction(err, wfInst) {
        expect(err).to.not.exist;
        expect(wfInst).to.exist;
        expect(wfInst.workflowDefinitionName).to.equal(workflowName);
        expect(wfInst.id).to.deep.equal(workflowInstance.id);
        expect(wfInst.processes).to.exist;
        done();
      });
    });

    it('model.workflow returns error if id is not specified', function testFunction(done) {
      expect(orderRecord).to.exist;
      OrderV0.workflow(null, bootstrap.defaultContext, function testFunction(err, wfInst) {
        expect(err).to.exist;
        expect(err.message).to.include('id is required to find attached Workflow Instance');
        done();
      });
    });

    it('model.tasks returns the tasks', function testFunction(done) {
      expect(orderRecord).to.exist;
      OrderV0.tasks(orderRecord.id, bootstrap.defaultContext, function testFunction(err, tasks) {
        expect(err).to.not.exist;
        expect(tasks).to.exist.and.be.an('array').of.length(1);
        done();
      });
    });

    it('model.tasks returns error if id is not specified', function testFunction(done) {
      expect(orderRecord).to.exist;
      OrderV0.tasks(null, bootstrap.defaultContext, function testFunction(err, tasks) {
        expect(err).to.exist;
        expect(err.message).to.include('id is required to find attached tasks');
        done();
      });
    });
  });

  describe('update operation(PUT)', function testFunction() {
    let workflowMapping;
    let workflowInstance;
    let orderRecord = {
      buyer: 'Adam',
      quantity: 143
    };
    before('attach workflow', function testFunction(done) {
      WorkflowManager.attachWorkflow({
        operation: 'update',
        modelName: 'OrderV0',
        version: 'v0',
        workflowBody: {
          workflowDefinitionName: workflowName
        }
      }, bootstrap.defaultContext, function testFunction(err, mappings) {
        expect(err).to.not.exist;
        expect(mappings).to.exist;
        expect(mappings.mappings).to.exist.and.be.an('array').of.length(1);
        workflowMapping = mappings.mappings[0];
        done();
      });
    });

    after('cleanup', function testFunction(done) {
      async.series([
        function testFunction(callback) {
          models.WorkflowInstance.destroyAll({}, callback);
        },
        function testFunction(callback) {
          models.ProcessInstance.destroyAll({}, callback);
        },
        function testFunction(callback) {
          models.Task.destroyAll({}, callback);
        },
        function testFunction(callback) {
          models.OrderV0.destroyAll({}, callback);
        },
        function testFunction(callback) {
          WorkflowManager.detachWorkflowWithVersion(workflowMapping.id, workflowMapping._version, bootstrap.defaultContext, function testFunction(err) {
            expect(err).to.not.exist;
            OrderV0.destroyAll({}, callback);
          });
        }
      ], function testFunction(err, results) {
        done(err);
      });
    });

    it('PUT on model ', function testFunction(done) {
      bootstrap.onTokenStatus(workflowName, 'start', 'complete', function testFunction(err, instance) {
        return done(err);
      });
      var url = bootstrap.basePath + '/OrderV0s?access_token=' + accessToken;
      bootstrap.api.put(url)
        .send(orderRecord)
        .set('Accept', 'application/json')
        .end(function testFunction(err, res) {
          if (err) {
            return done(err);
          }
          orderRecord = res.body;
        });
    });

    it('creates record immediately', function testFunction(done) {
      OrderV0.find({}, bootstrap.defaultContext, function testFunction(err, records) {
        expect(err).to.not.exist;
        expect(records).to.be.an('array').of.length(1);
        done();
      });
    });

    it('Triggers a workflow attached to model for create operation', function testFunction(done) {
      models.WorkflowInstance.find({ where: { correlationId: orderRecord.id } }, bootstrap.defaultContext, function testFunction(err, wfInst) {
        expect(err).to.not.exist;
        expect(wfInst).to.exist.and.be.an('array').of.length(1);
        workflowInstance = wfInst[0];
        done();
      });
    });

    it('model.workflow returns the workflow', function testFunction(done) {
      expect(orderRecord).to.exist;
      OrderV0.workflow(orderRecord.id, bootstrap.defaultContext, function testFunction(err, wfInst) {
        expect(err).to.not.exist;
        expect(wfInst).to.exist;
        expect(wfInst.workflowDefinitionName).to.equal(workflowName);
        expect(wfInst.id).to.deep.equal(workflowInstance.id);
        expect(wfInst.processes).to.exist;
        done();
      });
    });

    it('model.tasks returns the tasks', function testFunction(done) {
      expect(orderRecord).to.exist;
      OrderV0.tasks(orderRecord.id, bootstrap.defaultContext, function testFunction(err, tasks) {
        expect(err).to.not.exist;
        expect(tasks).to.exist.and.be.an('array').of.length(1);
        done();
      });
    });
  });

  describe('delete operation(Delete)', function testFunction() {
    let workflowMapping;
    let workflowInstance;
    let orderRecord = {
      buyer: 'Nancy',
      quantity: 6786
    };
    before('attach workflow', function testFunction(done) {
      WorkflowManager.attachWorkflow({
        operation: 'delete',
        modelName: 'OrderV0',
        version: 'v0',
        workflowBody: {
          workflowDefinitionName: workflowName
        }
      }, bootstrap.defaultContext, function testFunction(err, mappings) {
        expect(err).to.not.exist;
        expect(mappings).to.exist;
        expect(mappings.mappings).to.exist.and.be.an('array').of.length(1);
        workflowMapping = mappings.mappings[0];
        done();
      });
    });

    after('cleanup', function testFunction(done) {
      async.series([
        function testFunction(callback) {
          models.WorkflowInstance.destroyAll({}, callback);
        },
        function testFunction(callback) {
          models.ProcessInstance.destroyAll({}, callback);
        },
        function testFunction(callback) {
          models.Task.destroyAll({}, callback);
        },
        function testFunction(callback) {
          models.OrderV0.destroyAll({}, callback);
        },
        function testFunction(callback) {
          WorkflowManager.detachWorkflowWithVersion(workflowMapping.id, workflowMapping._version, bootstrap.defaultContext, function testFunction(err) {
            expect(err).to.not.exist;
            OrderV0.destroyAll({}, callback);
          });
        }
      ], function testFunction(err, results) {
        done(err);
      });
    });

    it('Post data to model ', function testFunction(done) {
      var url = bootstrap.basePath + '/OrderV0s?access_token=' + accessToken;
      bootstrap.api.post(url)
        .send(orderRecord)
        .set('Accept', 'application/json')
        .end(function testFunction(err, res) {
          if (err) {
            return done(err);
          }
          orderRecord = res.body;
          return done();
        });
    });

    it('creates a record', function testFunction(done) {
      OrderV0.find({}, bootstrap.defaultContext, function testFunction(err, records) {
        expect(err).to.not.exist;
        expect(records).to.be.an('array').of.length(1);
        done();
      });
    });

    it('Does not Triggers a workflow on create operation', function testFunction(done) {
      models.WorkflowInstance.find({ where: { correlationId: orderRecord.id } }, bootstrap.defaultContext, function testFunction(err, wfInst) {
        expect(err).to.not.exist;
        expect(wfInst).to.exist.and.be.an('array').of.length(0);
        done();
      });
    });

    it('Deleting data from model ', function testFunction(done) {
      bootstrap.onTokenStatus(workflowName, 'start', 'complete', function testFunction(err, instance) {
        return done(err);
      });
      var url = bootstrap.basePath + '/OrderV0s/' + orderRecord.id + '?access_token=' + accessToken;
      bootstrap.api.delete(url)
        .send(orderRecord)
        .set('Accept', 'application/json')
        .end(function testFunction(err, res) {
          if (err) {
            return done(err);
          }
          var data = res.body;
          expect(data).to.exist;
          expect(data.count).to.be.equal(1);
        });
    });

    it('Triggers a workflow on delete operation', function testFunction(done) {
      models.WorkflowInstance.find({ where: { correlationId: orderRecord.id } }, bootstrap.defaultContext, function testFunction(err, wfInst) {
        expect(err).to.not.exist;
        expect(wfInst).to.exist.and.be.an('array').of.length(1);
        workflowInstance = wfInst[0];
        done();
      });
    });

    it('model.workflow returns the workflow', function testFunction(done) {
      expect(orderRecord).to.exist;
      OrderV0.workflow(orderRecord.id, bootstrap.defaultContext, function testFunction(err, wfInst) {
        expect(err).to.not.exist;
        expect(wfInst).to.exist;
        expect(wfInst.workflowDefinitionName).to.equal(workflowName);
        expect(wfInst.id).to.deep.equal(workflowInstance.id);
        expect(wfInst.processes).to.exist;
        done();
      });
    });

    it('model.tasks returns the tasks', function testFunction(done) {
      expect(orderRecord).to.exist;
      OrderV0.tasks(orderRecord.id, bootstrap.defaultContext, function testFunction(err, tasks) {
        expect(err).to.not.exist;
        expect(tasks).to.exist.and.be.an('array').of.length(1);
        done();
      });
    });
  });

  describe('Custom operation. Trigger the workflow when operation is performed remote method', function testFunction() {
    let workflowMapping;
    let workflowInstance;
    let orderRecord = {};
    before('attach workflow', function testFunction(done) {
      WorkflowManager.attachWorkflow({
        operation: 'custom',
        modelName: 'OrderV0',
        version: 'v0',
        remote: {
          path: '/special-order/:id',
          method: 'SpclOrderBYId',
          verb: 'put'
        },
        workflowBody: {
          workflowDefinitionName: workflowName
        }
      }, bootstrap.defaultContext, function testFunction(err, mappings) {
        expect(err).to.not.exist;
        expect(mappings).to.exist;
        expect(mappings.mappings).to.exist.and.be.an('array').of.length(1);
        workflowMapping = mappings.mappings[0];
        done();
      });
    });

    after('cleanup', function testFunction(done) {
      async.series([
        function testFunction(callback) {
          models.WorkflowInstance.destroyAll({}, callback);
        },
        function testFunction(callback) {
          models.ProcessInstance.destroyAll({}, callback);
        },
        function testFunction(callback) {
          models.Task.destroyAll({}, callback);
        },
        function testFunction(callback) {
          models.OrderV0.destroyAll({}, callback);
        },
        function testFunction(callback) {
          WorkflowManager.detachWorkflowWithVersion(workflowMapping.id, workflowMapping._version, bootstrap.defaultContext, function testFunction(err) {
            expect(err).to.not.exist;
            OrderV0.destroyAll({}, callback);
          });
        }
      ], function testFunction(err, results) {
        done(err);
      });
    });

    it('POST- data to model ', function testFunction(done) {
      let order = {
        buyer: 'Dean',
        quantity: 12
      };
      var url = bootstrap.basePath + '/OrderV0s/special-order?access_token=' + accessToken;
      bootstrap.api.post(url)
        .send(order)
        .set('Accept', 'application/json')
        .end(function testFunction(err, res) {
          if (err) {
            return done(err);
          }
          var data = res.body;
          expect(data.specialOrder).to.be.true;
          return done();
        });
    });

    it('Does not Triggers a workflow on remote method(POST) custom operation', function testFunction(done) {
      models.WorkflowInstance.find({ where: { correlationId: orderRecord.id } }, bootstrap.defaultContext, function testFunction(err, wfInst) {
        expect(err).to.not.exist;
        expect(wfInst).to.exist.and.be.an('array').of.length(0);
        done();
      });
    });

    it('PUT- data to model ', function testFunction(done) {
      let order = {
        buyer: 'Castiel',
        quantity: 41
      };
      var url = bootstrap.basePath + '/OrderV0s/special-order?access_token=' + accessToken;
      bootstrap.api.put(url)
        .send(order)
        .set('Accept', 'application/json')
        .end(function testFunction(err, res) {
          if (err) {
            return done(err);
          }
          var data = res.body;
          expect(data.specialOrder).to.be.true;
          return done();
        });
    });

    it('Does not Triggers a workflow on remote method(PUT)- custom operation', function testFunction(done) {
      models.WorkflowInstance.find({ where: { correlationId: orderRecord.id } }, bootstrap.defaultContext, function testFunction(err, wfInst) {
        expect(err).to.not.exist;
        expect(wfInst).to.exist.and.be.an('array').of.length(0);
        done();
      });
    });

    it('PUT by Id- data to model ', function testFunction(done) {
      let order = {
        buyer: 'Bobby',
        quantity: 34
      };
      var id = 'Order65467661';
      bootstrap.onTokenStatus(workflowName, 'start', 'complete', function testFunction(err, instance) {
        return done(err);
      });
      var url = bootstrap.basePath + '/OrderV0s/special-order/' + id + '?access_token=' + accessToken;
      bootstrap.api.put(url)
        .send(order)
        .set('Accept', 'application/json')
        .end(function testFunction(err, res) {
          if (err) {
            return done(err);
          }
          orderRecord = res.body;
          expect(orderRecord.id).to.be.equal(id);
        });
    });

    it('Triggers a workflow on remote method (PUT by Id), custom operation', function testFunction(done) {
      models.WorkflowInstance.find({ where: { correlationId: orderRecord.id } }, bootstrap.defaultContext, function testFunction(err, wfInst) {
        expect(err).to.not.exist;
        expect(wfInst).to.exist.and.be.an('array').of.length(1);
        workflowInstance = wfInst[0];
        done();
      });
    });

    it('model.workflow returns the workflow', function testFunction(done) {
      expect(orderRecord).to.exist;
      OrderV0.workflow(orderRecord.id, bootstrap.defaultContext, function testFunction(err, wfInst) {
        expect(err).to.not.exist;
        expect(wfInst).to.exist;
        expect(wfInst.workflowDefinitionName).to.equal(workflowName);
        expect(wfInst.id).to.deep.equal(workflowInstance.id);
        expect(wfInst.processes).to.exist;
        done();
      });
    });

    it('model.tasks returns the tasks', function testFunction(done) {
      expect(orderRecord).to.exist;
      OrderV0.tasks(orderRecord.id, bootstrap.defaultContext, function testFunction(err, tasks) {
        expect(err).to.not.exist;
        expect(tasks).to.exist.and.be.an('array').of.length(1);
        done();
      });
    });
  });
});
