/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

let bootstrap = require('../bootstrap.js');
let chai = bootstrap.chai;
let expect = chai.expect;
let LuckyDraw = bootstrap.app.models.LuckyDraw;
let WorkflowManager = bootstrap.app.models.WorkflowManager;
let WorkflowMapping = bootstrap.app.models.WorkflowMapping;

let stateVerifier = require('../utils/state-verifier');
describe('Workflow Manager Tests', function CB() {
  let workflowName = 'workflow-manager';
  before('setup', function testFunction(done) {
    bootstrap.loadBpmnFile(workflowName, function testFunction(err, wfDefn) {
      expect(err).to.not.exist;
      expect(wfDefn).to.exist;
      done();
    });
  });
  after('cleanup', function testFunction(done) {
    LuckyDraw.destroyAll({}, bootstrap.getContext('usr1'), function cb(err, instance) {
      expect(err).to.not.exist;
      expect(instance).to.exist;
      bootstrap.app.models.WorkflowRequest.destroyAll({}, bootstrap.getContext('usr1'), function cb(err, instance) {
        expect(err).to.not.exist;
        expect(instance).to.exist;
        bootstrap.cleanUp(workflowName, done);
      });
    });
  });

  describe('attach/detach Workflow tests', function testFunction() {
    describe('validation failures', function testFunction() {
      it('attach fails if operation is not specified', function testFunction(done) {
        WorkflowManager.attachWorkflow({}, bootstrap.defaultContext, function testFunction(err, mapping) {
          expect(err).to.exist;
          expect(err.code).to.equal('INVALID_MAPPING_DATA');
          expect(err.message).to.equal('operation parameter is required');
          done();
        });
      });

      it('attach fails if invalid operation is specified', function testFunction(done) {
        WorkflowManager.attachWorkflow({
          operation: 'xxxxx'
        }, bootstrap.defaultContext, function testFunction(err, mapping) {
          expect(err).to.exist;
          expect(err.code).to.equal('INVALID_MAPPING_DATA');
          expect(err.message).to.equal('operation is not valid');
          done();
        });
      });

      it('attach fails if modelName is not specified', function testFunction(done) {
        WorkflowManager.attachWorkflow({
          operation: 'create'
        }, bootstrap.defaultContext, function testFunction(err, mapping) {
          expect(err).to.exist;
          expect(err.code).to.equal('INVALID_MAPPING_DATA');
          expect(err.message).to.equal('modelName parameter is required');
          done();
        });
      });
      it('attach fails if invalid modelName is specified', function testFunction(done) {
        WorkflowManager.attachWorkflow({
          operation: 'create',
          modelName: 'XXXX'
        }, bootstrap.defaultContext, function testFunction(err, mapping) {
          expect(err).to.exist;
          expect(err.code).to.equal('INVALID_MAPPING_DATA');
          expect(err.message).to.equal('modelName is not valid');
          done();
        });
      });

      it('attach fails if workflowBody is not specified', function testFunction(done) {
        WorkflowManager.attachWorkflow({
          operation: 'create',
          modelName: 'LuckyDraw'
        }, bootstrap.defaultContext, function testFunction(err, mapping) {
          expect(err).to.exist;
          expect(err.code).to.equal('INVALID_MAPPING_DATA');
          expect(err.message).to.equal('workflowBody parameter is required');
          done();
        });
      });

      it('attach fails if workflowDefinitionName is not specified', function testFunction(done) {
        WorkflowManager.attachWorkflow({
          operation: 'create',
          modelName: 'LuckyDraw',
          workflowBody: {}
        }, bootstrap.defaultContext, function testFunction(err, mapping) {
          expect(err).to.exist;
          expect(err.code).to.equal('INVALID_MAPPING_DATA');
          expect(err.message).to.equal('workflowBody parameter is required');
          done();
        });
      });

      it('attach fails if invalid workflowDefinitionName is specified', function testFunction(done) {
        WorkflowManager.attachWorkflow({
          operation: 'create',
          modelName: 'LuckyDraw',
          workflowBody: {
            workflowDefinitionName: 'xxxx'
          }
        }, bootstrap.defaultContext, function testFunction(err, mapping) {
          expect(err).to.exist;
          expect(err.code).to.equal('INVALID_MAPPING_DATA');
          expect(err.message).to.equal('workflow definition not found');
          done();
        });
      });


      it('detach fails if id is not specified', function testFunction(done) {
        WorkflowManager.detachWorkflowWithVersion(null, 'v1', bootstrap.defaultContext, function testFunction(err) {
          expect(err).to.exist;
          expect(err.message).to.equal('id parameter is required');
          expect(err.code).to.equal('INVALID_INPUT');
          done();
        });
      });

      it('detach fails if version is not specified', function testFunction(done) {
        WorkflowManager.detachWorkflowWithVersion('id1', null, bootstrap.defaultContext, function testFunction(err) {
          expect(err).to.exist;
          expect(err.message).to.equal('version parameter is required');
          expect(err.code).to.equal('INVALID_INPUT');
          done();
        });
      });

      it('detach fails if invalid id/version specified', function testFunction(done) {
        WorkflowManager.detachWorkflowWithVersion('id1', 'v1', bootstrap.defaultContext, function testFunction(err) {
          expect(err).to.exist;
          expect(err.name).to.equal('Data Error');
          done();
        });
      });
    });

    describe('workflow mapping', function testFunction() {
      let workflowMapping;
      before('create the mapping', function testFunction(done) {
        WorkflowManager.attachWorkflow({
          operation: 'update',
          modelName: 'LuckyDraw',
          wfDependent: false,
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
        bootstrap.cleanUp(workflowName, function testFunction(err1) {
          WorkflowMapping.destroyAll({}, function testFunction(err2, data) {
            LuckyDraw.destroyAll({}, function testFunction(err3, data) {
              done(err1 || err2 || err3);
            });
          });
        });
      });

      it('populates the defaults correctly', function testFunction(done) {
        expect(workflowMapping).to.exist;
        expect(workflowMapping.engineType).to.equal('oe-workflow');
        expect(workflowMapping.wfDependent).to.be.false;
        expect(workflowMapping.makersRecall).to.be.false;
        expect(workflowMapping.actualModelName).to.equal('LuckyDraw');
        expect(workflowMapping.version).to.equal('v1');
        done();
      });

      it('does not allow creating same-mapping again', function testFunction(done) {
        WorkflowManager.attachWorkflow({
          operation: 'update',
          modelName: 'LuckyDraw',
          wfDependent: false,
          workflowBody: {
            workflowDefinitionName: workflowName
          }
        }, bootstrap.defaultContext, function testFunction(err, mappings) {
          expect(err).to.exist;
          expect(err.message).to.equal('Workflow is already attached');
          expect(mappings).to.not.exist;
          done();
        });
      });

      it('can be fetched through viewAttachedWorkflows', function testFunction(done) {
        WorkflowManager.viewAttachedWorkflows({}, bootstrap.defaultContext, function testFunction(err, results) {
          expect(err).to.not.exist;
          expect(results).to.exist.and.be.an('array').of.length(1);
          stateVerifier.checkEachProperty(results[0], workflowMapping, ['id', 'engineType', 'workflowBody', 'modelName', 'actualModelName', 'operation', 'version', 'wfDependent', 'makersRecall']);
          // expect(results[0]).to.deep.equal(workflowMapping);
          done();
        });
      });

      it('viewAttachedWorkflows errors if filter is not correct', function testFunction(done) {
        WorkflowManager.viewAttachedWorkflows({
          where: {
            $in: []
          }
        }, bootstrap.defaultContext, function testFunction(err, results) {
          expect(err).to.exist;
          expect(err.message).to.include('Unable to fetch WorkflowMapping');
          expect(results).to.not.exist;
          done();
        });
      });

      it('does NOT trigger the workflow when unmapped operation is performed', function testFunction(done) {
        bootstrap.onComplete(workflowName, function testFunction(err, instance) {
          expect(err).to.not.exist;
          done(new Error('Not expecting workflow to trigger on Create'));
        });
        LuckyDraw.create({
          owner: 'John',
          sequence: 1000
        }, bootstrap.getContext('usr1'), function testFunction(err, tkt) {
          expect(err).to.not.exist;
          expect(tkt).to.exist;
        });
        setTimeout(function testFunction() {
          bootstrap.removeCompleteListener(workflowName);
          done();
        }, 500);
      });

      it('triggers the workflow when mapped operation is performed', function testFunction(done) {
        bootstrap.onComplete(workflowName, function testFunction(err, instance) {
          expect(err).to.not.exist;
          expect(instance._processVariables._modelInstance).to.exist;
          expect(instance._processVariables._modelInstance.sequence).to.equal(1001);
          done();
        });
        LuckyDraw.create({
          owner: 'John',
          sequence: 1000
        }, bootstrap.getContext('usr1'), function testFunction(err, tkt) {
          expect(err).to.not.exist;
          expect(tkt).to.exist;
          tkt.updateAttributes({
            _version: tkt._version,
            sequence: 1001
          }, function testFunction(err, data) {
            expect(err).to.not.exist;
            expect(data.sequence).to.equal(1001);
          });
        });
      });

      it('Stops triggering workflow when detached', function testFunction(done) {
        bootstrap.onComplete(workflowName, function testFunction(err, instance) {
          expect(err).to.not.exist;
          done(new Error('Not expecting workflow to trigger on Update'));
        });
        WorkflowManager.detachWorkflowWithVersion(workflowMapping.id, workflowMapping._version, bootstrap.defaultContext, function testFunction(err) {
          expect(err).to.not.exist;
          LuckyDraw.create({
            owner: 'John',
            sequence: 1000
          }, bootstrap.getContext('usr1'), function testFunction(err, tkt) {
            expect(err).to.not.exist;
            expect(tkt).to.exist;

            tkt.updateAttributes({
              _version: tkt._version,
              sequence: 1001
            }, function testFunction(err, data) {
              expect(err).to.not.exist;
              expect(data.sequence).to.equal(1001);


              setTimeout(function testFunction() {
                bootstrap.removeCompleteListener(workflowName);
                done();
              }, 500);
            });
          });
        });
      });
    });
  });
});
