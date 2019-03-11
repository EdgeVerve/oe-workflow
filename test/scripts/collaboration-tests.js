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
let async = require('async');

describe('Collaboration Tests', function CB() {
  let workflowNameChild = 'collaboration-collapsed';
  let workflowNameMain = 'collaboration';
  let workflowPayload = {
    processVariables: {
      var1: 'val1',
      var2: 'val2'
    }
  };

  let procInstance1; let procInstance2; let procInstanceCollapsed;
  it('Workflow creation fails when collapsed flow is not defined', function testFunction(done) {
    bootstrap.loadBpmnFile(workflowNameMain, function testFunction(err, wfDefn) {
      expect(err).to.exist;
      expect(err.code).to.equal('MISSING_POOL_DEFN');
      done();
    });
  });

  describe('Collaboration Tests', function testFunction() {
    before('define, trigger and complete workflow', function testFunction(done) {
      bootstrap.loadBpmnFile(workflowNameChild, function testFunction(err1) {
        bootstrap.loadAndTrigger(workflowNameMain, workflowPayload, function testFunction(err2) {});
      });

      bootstrap.onUserTask(workflowNameMain + '$process2', 'UserTask', function testFunction(err, task) {
        expect(err).to.not.exist;
        task.complete({
          pv: {
            taskVar: 'someValue'
          }
        }, bootstrap.defaultContext, function testFunction(err, task) {
          expect(err).to.not.exist;
          expect(task.status).to.equal(Status.COMPLETE);
        });
      });

      async.parallel([function testFunction(cb) {
        bootstrap.onComplete(workflowNameMain + '$process1', cb);
      }, function testFunction(cb) {
        bootstrap.onComplete(workflowNameMain + '$process2', cb);
      }, function testFunction(cb) {
        bootstrap.onComplete(workflowNameChild, cb);
      }], function testFunction(err, results) {
        expect(err).to.not.exist;
        expect(results).to.be.an('array').of.length(3);
        procInstance1 = results[0];
        procInstance2 = results[1];
        procInstanceCollapsed = results[2];
        done(err);
      });
    });
    after('Cleanup data', function testFunction(done) {
      bootstrap.cleanUp(workflowNameMain, function testFunction(err1) {
        bootstrap.cleanUp(workflowNameChild, function testFunction(err2) {
          done(err1 || err2);
        });
      });
    });


    it('triggers and completes all pool processes', function testFunction(done) {
      expect(procInstance1).to.exist;
      stateVerifier.isComplete(procInstance1);
      expect(procInstance2).to.exist;
      stateVerifier.isComplete(procInstance2);
      expect(procInstanceCollapsed).to.exist;
      stateVerifier.isComplete(procInstanceCollapsed);
      done();
    });

    it('passes a copy of process-variables to each pool process', function testFunction(done) {
      stateVerifier.verifyPV(procInstance1, workflowPayload.processVariables);
      stateVerifier.verifyPV(procInstance2, workflowPayload.processVariables);
      stateVerifier.verifyPV(procInstanceCollapsed, workflowPayload.processVariables);
      done();
    });

    it('Pool specific modifications to process-variables are local', function testFunction(done) {
      expect(procInstance1._processVariables).to.have.a.property('Script1Var').that.equals('Scr1');
      expect(procInstance2._processVariables).to.not.have.a.property('Script1Var');
      expect(procInstanceCollapsed._processVariables).to.not.have.a.property('Script1Var');

      expect(procInstance2._processVariables).to.have.a.property('taskVar').that.equals('someValue');
      expect(procInstance1._processVariables).to.not.have.a.property('taskVar');
      expect(procInstanceCollapsed._processVariables).to.not.have.a.property('taskVar');

      expect(procInstanceCollapsed._processVariables).to.have.a.property('Script2Var').that.equals('Scr2');
      expect(procInstance1._processVariables).to.not.have.a.property('Script2Var');
      expect(procInstance2._processVariables).to.not.have.a.property('Script2Var');

      done();
    });
  });
});
