/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

let bootstrap = require('../bootstrap.js');
let chai = bootstrap.chai;
let expect = chai.expect;
let Status = bootstrap.Status;
let stateVerifier = require('../utils/state-verifier');
let fs = require('fs');
var path = require('path');
var decisionTableData = require('../bpmn-files/DecisionTableData.json');
var decisionTreeData = require('../bpmn-files/DecisionTreeData.json');

describe('Business Rule Node', function CB(){

  describe('Decision Table Tests', function CB() {
    let workflowName = 'business-rule-decision-table';
  
    before('define workflow', function testFunction(done) {
      /* Sometimes Oracle takes time */
      this.timeout(60000);
      let fileContents = '';
      var readStream = fs.createReadStream(path.resolve('./test/bpmn-files/Adjustments.xlsx'), 'base64');
      readStream.on('data', function dataCb(chunk) {
        fileContents += chunk;
      }).on('end', function endCb() {
        bootstrap.app.models.DecisionTable.create({
          name: 'Adjustments',
          documentName: 'Adjustments.xlsx',
          documentData: 'data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,' + fileContents
        }, bootstrap.defaultContext, function cb(err, data) {
          expect(err).to.not.exist;
          expect(data).to.exist.and.have.property('decisionRules').that.exists;

          bootstrap.loadBpmnFile(workflowName, function testFunction(err) {
            done(err);
          });
        });
      });
    });
    after('Cleanup data', function testFunction(done) {
      bootstrap.app.models.DecisionTable.destroyAll({}, bootstrap.defaultContext, function cb(err) {
        expect(err).to.not.exist;
        bootstrap.cleanUp(workflowName, done);
      });
    });
  
    it('errors when underlying decision-table is not defined', function cb(done) {
      bootstrap.triggerAndWaitForTokenStatus(workflowName, {
        processVariables: {
          ruleName: 'XAdjustments'
        }
      }, 'BusinessRule Task', Status.FAILED, function testFunction(err, wfInst, procInst, token) {
        expect(err).to.not.exist;
        expect(procInst).to.exist;
        stateVerifier.isRunning(procInst);
        stateVerifier.verifyTokens(procInst, ['Start', {
          name: 'BusinessRule Task',
          status: Status.FAILED
        }]);

        expect(token.status).to.equal(Status.FAILED);
        expect(token.error).to.exist;
        expect(token.error.message).to.equal('No Document found for DocumentName XAdjustments');
        done();
      });
    });
  
    it('executes the rule and passes results as message to next node', function testFunction(done) {
      bootstrap.triggerAndComplete(workflowName, {
        processVariables: {
          ruleName: 'Adjustments'
        }
      }, function testFunction(err, wfInst, procInst) {
        expect(err).to.not.exist;
        expect(procInst).to.exist;
        stateVerifier.isComplete(procInst);
        stateVerifier.verifyTokens(procInst, ['Start', 'BusinessRule Task', 'Script Task', 'End']);
        expect(procInst._processVariables).to.exist;
        expect(procInst._processVariables.ruleEngineDecision).to.exist;
        expect(procInst._processVariables.ruleEngineDecision.output).to.exist;
        expect(procInst._processVariables.ruleEngineDecision.output).to.deep.equal({
          // Customer: 'Private',
          // OrderSize: 25,
          Discount: 0.05,
          Shipping: 'Air'
        });
        done();
      });
    });
  });

  describe('Decision Service Tests', function CB() {
    let workflowName = 'business-rule-decision-service';

    before('define workflow', function testFunction(done) {
      /* Sometimes Oracle takes time */
      this.timeout(60000);
      let fileContents = '';
      var readStream = fs.createReadStream(path.resolve('./test/bpmn-files/Service.xlsx'), 'base64');
      readStream.on('data', function dataCb(chunk) {
        fileContents += chunk;
      }).on('end', function endCb() {
        bootstrap.app.models.DecisionGraph.create({
          name: 'test',
          documentName: 'Service.xlsx',
          documentData: 'data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,' + fileContents
        }, bootstrap.defaultContext, function cb(err, data) {
          expect(err).to.not.exist;
          expect(data).to.exist.and.have.property('data').that.exists;
          bootstrap.app.models.DecisionService.create({
            name: 'service1',
            decisions: ['Routing'],
            graphId: 'test'
          }, bootstrap.defaultContext, function cb(err, data){
            expect(err).to.not.exist; 
            expect(data).to.exist.and.have.property('id').that.exists;
            bootstrap.loadBpmnFile(workflowName, function testFunction(err) {
              done(err);
            });
          })
        });
      });
    });
    after('Cleanup data', function testFunction(done) {
      bootstrap.app.models.DecisionGraph.destroyAll({}, bootstrap.defaultContext, function cb(err) {
        expect(err).to.not.exist;
        bootstrap.app.models.DecisionService.destroyAll({}, bootstrap.defaultContext, function cb(err) {
          expect(err).to.not.exist;
          bootstrap.cleanUp(workflowName, done);
        });
      });
    });
  
    it('errors when underlying decision-service is not defined', function cb(done) {
      bootstrap.triggerAndWaitForTokenStatus(workflowName, {
        processVariables: {
          serviceName: 'wrongService',
          income: 10000
        }
      }, 'BusinessRule Task', Status.FAILED, function testFunction(err, wfInst, procInst, token) {
        expect(err).to.not.exist;
        expect(procInst).to.exist;
        stateVerifier.isRunning(procInst);
        stateVerifier.verifyTokens(procInst, ['Start', {
          name: 'BusinessRule Task',
          status: Status.FAILED
        }]);
        expect(token.status).to.equal(Status.FAILED);
        expect(token.error).to.exist;
        expect(token.error.message).to.equal('No Service found for ServiceName wrongService');
        done();
      });
    });
  
    it('invokes the service and passes results as message to next node', function testFunction(done) {
      bootstrap.triggerAndComplete(workflowName, {
        processVariables: {
          serviceName: 'service1',
          income: 10000
        }
      }, function testFunction(err, wfInst, procInst) {
        expect(err).to.not.exist;
        expect(procInst).to.exist;
        stateVerifier.isComplete(procInst);
        stateVerifier.verifyTokens(procInst, ['Start', 'BusinessRule Task', 'Script Task', 'End']);
        expect(procInst._processVariables).to.exist;
        expect(procInst._processVariables.ruleEngineDecision).to.exist;
        expect(procInst._processVariables.ruleEngineDecision.output).to.exist;
        expect(procInst._processVariables.ruleEngineDecision.output.Routing).to.exist;
        expect(procInst._processVariables.ruleEngineDecision.output.Routing).to.deep.equal({
          Routing: 'ACCEPT'
        });
        done();
      });
    });
  });

  describe('Decision Tree Tests', function CB() {
    let workflowName = 'business-rule-decision-tree';
  
    before('define workflow', function testFunction(done) {
      /* Sometimes Oracle takes time */
      this.timeout(60000);
      bootstrap.app.models.DecisionTable.create(decisionTableData, bootstrap.defaultContext, function cb(err, data) {
        expect(err).to.not.exist;
        expect(data).to.exist;
        bootstrap.app.models.DecisionTree.create(decisionTreeData, bootstrap.defaultContext, function cb(err, data){
          expect(err).to.not.exist;
          expect(data).to.exist.and.have.property('id').that.exists;
          bootstrap.loadBpmnFile(workflowName, function testFunction(err) {
            done(err);
          });
        })
      });
    });
  
    after('Cleanup data', function testFunction(done) {
      bootstrap.app.models.DecisionTable.destroyAll({}, bootstrap.defaultContext, function cb(err) {
        expect(err).to.not.exist;
        bootstrap.app.models.DecisionTree.destroyAll({}, bootstrap.defaultContext, function cb(err) {
          expect(err).to.not.exist;
          bootstrap.cleanUp(workflowName, done);
        });
      });
    });
  
    it('errors when underlying decision-tree is not defined', function cb(done) {
      bootstrap.triggerAndWaitForTokenStatus(workflowName, {
        processVariables: {
          treeName: 'wrongTree'
        }
      }, 'BusinessRule Task', Status.FAILED, function testFunction(err, wfInst, procInst, token) {
        expect(err).to.not.exist;
        expect(procInst).to.exist;
        stateVerifier.isRunning(procInst);
        stateVerifier.verifyTokens(procInst, ['Start', {
          name: 'BusinessRule Task',
          status: Status.FAILED
        }]);
        expect(token.status).to.equal(Status.FAILED);
        expect(token.error).to.exist;
        expect(token.error.message).to.equal('No Tree found for TreeName wrongTree');
        done();
      });
    });
  
    it('executes the tree and passes results as message to next node', function testFunction(done) {
      bootstrap.triggerAndComplete(workflowName, {
        processVariables: {
          treeName: 'sampleTree'
        }
      }, function testFunction(err, wfInst, procInst) {
        expect(err).to.not.exist;
        expect(procInst).to.exist;
        stateVerifier.isComplete(procInst);
        stateVerifier.verifyTokens(procInst, ['Start', 'BusinessRule Task', 'Script Task', 'End']);
        expect(procInst._processVariables).to.exist;
        expect(procInst._processVariables.ruleEngineDecision).to.exist;
        expect(procInst._processVariables.ruleEngineDecision.output).to.exist;
        expect(procInst._processVariables.ruleEngineDecision.output).to.deep.equal({
          location: 'US',
          preApproved: false,
          eligibility: 3000
        });
        done();
      });
    });
  });
  
});