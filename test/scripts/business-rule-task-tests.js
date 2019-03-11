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

describe('Business Rule Node', function CB() {
  let workflowName = 'business-rule-task';

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
      expect(procInst._processVariables.ruleEngineDecision.body).to.exist;
      expect(procInst._processVariables.ruleEngineDecision.body).to.deep.equal({
        // Customer: 'Private',
        // OrderSize: 25,
        Discount: 0.05,
        Shipping: 'Air'
      });
      done();
    });
  });
});
