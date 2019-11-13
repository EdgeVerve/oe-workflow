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

describe('Message Start Event Tests Using Send Task as Source of Message Flow', function CB() {
  let workflowName = 'message-start-send';
  before('define workflow', function testFunction(done) {
    bootstrap.loadAndTrigger(workflowName, {}, function testFunction(err, wfDefn, wfInstance) {
      expect(err).to.not.exist;
      expect(wfInstance).to.exist;
      done();
    });
  });
  after('cleanup data', function testFunction(done) {
    bootstrap.removeCompleteListener(workflowName + '$SendMessage');
    bootstrap.removeCompleteListener(workflowName + '$ReceiveMessage');
    bootstrap.cleanUp(workflowName, done);
  });

  it('TIMING FAILURE: Receiver resumes and completes when message is received from sender', function testFunction(done) {
    async.parallel([function sendCompletion(callback) {
      bootstrap.onComplete(workflowName + '$SendMessage', function testFunction(err, instance) {
        expect(err).to.not.exist;
        expect(instance).to.exist;
        stateVerifier.isComplete(instance);
        stateVerifier.verifyTokens(instance, ['Start P1', 'Wait300', 'SendTask', 'End P1']);
        callback(null, instance);
      });
    }, function receiveCompletion(callback) {
      bootstrap.onComplete(workflowName + '$ReceiveMessage', function testFunction(err, instance) {
        expect(err).to.not.exist;
        expect(instance).to.exist;
        stateVerifier.isComplete(instance);
        stateVerifier.verifyTokens(instance, ['MessageStart', 'T2', 'End P2']);
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

      let sendToken = allTokens.find(v => v.name === 'SendTask');
      let receiveToken = allTokens.find(v => v.name === 'MessageStart');

      expect(new Date(sendToken.endTime)).to.be.beforeTime(new Date(receiveToken.endTime));

      done();
    });
  });
});
