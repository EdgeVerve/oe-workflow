/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

let bootstrap = require('../bootstrap.js');
let chai = bootstrap.chai;
let expect = chai.expect;
let models = bootstrap.app.models;

let stateVerifier = require('../utils/state-verifier');

describe('Update via Workflow tests', function CB() {
  let workflowName = 'update-via-workflow';
  let workflowMapping;
  before('define workflow', function testFunction(done) {
    bootstrap.loadBpmnFile(workflowName, function testFunction(err, wfDef) {
      expect(err).to.not.exist;
      models.WorkflowManager.attachWorkflow({
        operation: 'create',
        modelName: 'StoreV1',
        version: 'v1',
        wfDependent: true,
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
  });
  after('cleanup data', function testFunction(done) {
    models.WorkflowManager.detachWorkflowWithVersion(workflowMapping.id, workflowMapping._version, bootstrap.defaultContext, function testFunction(err) {
      expect(err).to.not.exist;
      models.StoreV1.destroyAll({}, function cb() {
        bootstrap.cleanUp(workflowName, done);
      });
    });
  });


  it('finalize transaction connector updates the record', function testFunction(done) {
    let createdRecord;
    models.StoreV1.create({owner: 'Shaw', sequence: 4000}, bootstrap.defaultContext, function cb(err, tkt) {
      expect(err).to.not.exist;
      expect(tkt).to.exist;
      expect(tkt.owner).to.equal('Shaw');
      expect(tkt.sequence).to.equal(4000);
      createdRecord = tkt;
    });
    bootstrap.onComplete(workflowName, function cb(err, instance) {
      expect(err).to.not.exist;
      stateVerifier.isComplete(instance);
      models.StoreV1.findById(createdRecord.id, bootstrap.defaultContext, function cb(err, record) {
        expect(err).to.not.exist;
        expect(record).to.exist;
        expect(record.owner).to.equal('Sia');
        expect(record.sequence).to.equal(9000);
        done();
      });
    });
  });
});
