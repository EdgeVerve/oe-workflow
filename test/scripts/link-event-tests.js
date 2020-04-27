/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

let bootstrap = require('../bootstrap.js');
let chai = bootstrap.chai;
let expect = chai.expect;
let stateVerifier = require('../utils/state-verifier');

describe('Link Event Tests', function CB() {
  let instance;
  let workflowName = 'link-event';
  let workflowPayload = {
    processVariables: {
      "msgA": "hi to link a",
      "msgB": "hi to link b",
      "msgC": "hi to link c"
    }
  }

  before('define workflow', function testFunction(done) {
    bootstrap.loadAndTrigger(workflowName, workflowPayload, function testFunction(err, wfDefn, wfInst) {
      expect(err).to.not.exist;
      expect(wfDefn).to.exist;
      expect(wfInst).to.exist;
      done();
    });
  });

  after('cleanup data', function testFunction(done) {
    bootstrap.removeCompleteListener(workflowName);
    bootstrap.cleanUp(workflowName, done);
  });

  it('Link Events Passes the Flow from one Node to other Node and Completes the workflow', function testFunction(done) {
    bootstrap.onComplete(workflowName, function testFunction(err, inst) {
      expect(err).to.not.exist;
      expect(inst).to.exist;
      instance = inst;
      stateVerifier.isComplete(instance);
      stateVerifier.verifyTokens(instance, ['Start', 'PGIn', 'ScriptA', 'ScriptB', 'ScriptC', 'ScriptA2', 'ScriptB2', 'ScriptC2', 'EndA', 'EndB', 'EndC']);
      expect(instance._processVariables).to.exist;
      expect(instance._processVariables).to.have.a.property('addA').that.equals(3);
      expect(instance._processVariables).to.have.a.property('addB').that.equals(7);
      expect(instance._processVariables).to.have.a.property('addC').that.equals(11);
      expect(instance._processVariables).to.have.a.property('scriptA').that.equals('done');
      expect(instance._processVariables).to.have.a.property('scriptB').that.equals('done');
      expect(instance._processVariables).to.have.a.property('scriptC').that.equals('done');
      done();
    });
  });

  it('Process Tokens wont be Created for Link Events', function testFunction(done) {
    let linkTokens = stateVerifier.fetchMatchingTokens(instance, 'Link');
    let tokenD = stateVerifier.fetchTokenByName(instance, 'D');
    let tokenC = stateVerifier.fetchTokenByName(instance, 'C');
    expect(linkTokens).to.exist.and.be.an('array').of.length(0);
    expect(tokenD).to.not.exist;
    expect(tokenC).to.not.exist;
    done();
  });

  it('Messages Can be Passed from one Node to other Node via Link Events', function testFunction(done) {
    let scriptA2 = stateVerifier.fetchTokenByName(instance, 'ScriptA2');
    expect(scriptA2).to.exist.and.have.property('message');
    expect(scriptA2.message).to.have.a.property('textA').that.equals('HI TO LINK A');
    expect(scriptA2.message).to.have.a.property('resultA').that.equals(3);
    let scriptB2 = stateVerifier.fetchTokenByName(instance, 'ScriptB2');
    expect(scriptB2).to.exist.and.have.property('message');
    expect(scriptB2.message).to.have.a.property('textB').that.equals('HI TO LINK B');
    expect(scriptB2.message).to.have.a.property('resultB').that.equals(7);
    let scriptC2 = stateVerifier.fetchTokenByName(instance, 'ScriptC2');
    expect(scriptC2).to.exist.and.have.property('message');
    expect(scriptC2.message).to.have.a.property('textC').that.equals('HI TO LINK C');
    expect(scriptC2.message).to.have.a.property('resultC').that.equals(11);
    done();
  });

});