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
let async = require('async');

describe('Message Start Event Tests Using Intermediate Message Throw Event as Source of Message Flow', function CB() {
  let workflowName = 'message-start-throw';
  before('define workflow', function testFunction(done) {
    bootstrap.loadBpmnFile(workflowName, function testFunction(err) {
      done(err);
    });
  });

  after('cleanup data', function testFunction(done) {
    bootstrap.cleanUp(workflowName, done);
  });

  afterEach(function testFunction(done) {
    bootstrap.removeCompleteListener(workflowName + '$SendMessageProcess');
    bootstrap.removeCompleteListener(workflowName + '$ReceiveMessageProcess');
    done();
  });

  it('For Path1: MessageStart1 resumes and completes when message is received from SendMessage1', function testFunction(done) {
    bootstrap.triggerWorkflow(workflowName, {
      processVariables: {
        path1: 1
      }
    }, function testFunction(err, wfInstance) {
      expect(err).to.not.exist;
      expect(wfInstance).to.exist;
    });
    async.parallel([function sendCompletion(callback) {
      bootstrap.onComplete(workflowName + '$SendMessageProcess', function testFunction(err, instance) {
        expect(err).to.not.exist;
        expect(instance).to.exist;
        stateVerifier.isComplete(instance);
        stateVerifier.verifyTokens(instance, ['Start P1', 'Wait300', 'EGIn', 'SendMessage1', 'EGOutP1', 'End P1'], true);
        callback(null, instance);
      });
    }, function receiveCompletion(callback) {
      bootstrap.onComplete(workflowName + '$ReceiveMessageProcess', function testFunction(err, instance) {
        expect(err).to.not.exist;
        expect(instance).to.exist;
        stateVerifier.isComplete(instance);
        stateVerifier.verifyTokens(instance, ['MessageStart1', { name: 'MessageStart2', status: 'interrupted' }, 'T1', 'EGOutP2', 'T3', 'End P2']);
        callback(null, instance);
      });
    }], function testFunction(err, results) {
      expect(err).to.not.exist;
      expect(results).to.exist;
      let allTokens = results.map(v => Object.values(v._processTokens))
        .reduce((a, v) => {
          a = a || [];
          return a.concat(v);
        }).sort((a, b) => {
          return ((new Date(a.startTime)) - (new Date(b.startTime)));
        });

      let sendToken = allTokens.find(v => v.name === 'SendMessage1');
      let receiveToken = allTokens.find(v => v.name === 'MessageStart1');

      expect(new Date(sendToken.endTime)).to.be.beforeTime(new Date(receiveToken.endTime));

      done();
    });
  });

  it('For Path2: MessageStart2 resumes and completes when message is received from SendMessage2', function testFunction(done) {
    bootstrap.triggerWorkflow(workflowName, {
      processVariables: {
        path2: 2
      }
    }, function testFunction(err, wfInstance) {
      expect(err).to.not.exist;
      expect(wfInstance).to.exist;
    });
    async.parallel([function sendCompletion(callback) {
      bootstrap.onComplete(workflowName + '$SendMessageProcess', function testFunction(err, instance) {
        expect(err).to.not.exist;
        expect(instance).to.exist;
        stateVerifier.isComplete(instance);
        stateVerifier.verifyTokens(instance, ['Start P1', 'Wait300', 'EGIn', 'SendMessage2', 'EGOutP1', 'End P1'], true);
        callback(null, instance);
      });
    }, function receiveCompletion(callback) {
      bootstrap.onComplete(workflowName + '$ReceiveMessageProcess', function testFunction(err, instance) {
        expect(err).to.not.exist;
        expect(instance).to.exist;
        stateVerifier.isComplete(instance);
        stateVerifier.verifyTokens(instance, [{ name: 'MessageStart1', status: 'interrupted' }, 'MessageStart2', 'T2', 'EGOutP2', 'T3', 'End P2']);
        callback(null, instance);
      });
    }], function testFunction(err, results) {
      expect(err).to.not.exist;
      expect(results).to.exist;
      let allTokens = results.map(v => Object.values(v._processTokens))
        .reduce((a, v) => {
          a = a || [];
          return a.concat(v);
        }).sort((a, b) => {
          return ((new Date(a.startTime)) - (new Date(b.startTime)));
        });

      let sendToken = allTokens.find(v => v.name === 'SendMessage2');
      let receiveToken = allTokens.find(v => v.name === 'MessageStart2');

      expect(new Date(sendToken.endTime)).to.be.beforeTime(new Date(receiveToken.endTime));

      done();
    });
  });
});
