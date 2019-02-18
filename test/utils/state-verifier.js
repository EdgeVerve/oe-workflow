var chai = require('chai');
var assert = chai.assert;
var expect = chai.expect;

module.exports = {
  isRunning: function iP(instance) {
    assert.strictEqual(instance._status, 'running', instance.processDefinitionName + ' is expected running but is ' + instance._status);
  },
  isInterrupted: function iP(instance) {
    assert.strictEqual(instance._status, 'interrupted', instance.processDefinitionName + ' is expected interrupted but is ' + instance._status);
  },
  isFailed: function iF(instance) {
    assert.strictEqual(instance._status, 'failed', instance.processDefinitionName + ' is expected failed but is ' + instance._status);
  },
  isComplete: function iC(instance) {
    assert.strictEqual(instance._status, 'complete', instance.processDefinitionName + ' is expected complete but is ' + instance._status);
  },
  fetchTokenByName: function fetchTokenByName(instance, name) {
    var tokens = instance._processTokens;
    var token = Object.keys(tokens).filter(function filterByTokenName(tokenId) {
      return tokens[tokenId].name === name ? true : false;
    });
    return token.length === 1 ? tokens[token[0]] : null;
  },
  fetchMatchingTokens: function fetchMatchingTokens(instance, match) {
    var matchingIds = Object.keys(instance._processTokens).filter(tokenId => {
      let candidate = instance._processTokens[tokenId];
      return Object.keys(match).every(k => {
        return candidate[k] === match[k];
      });
    });

    return matchingIds.map(tid => instance._processTokens[tid]);
  },
  verifyTokens: function v(instance, expectedState, partialFlag) {
    // first check state passed should be an array
    assert.strictEqual(expectedState.constructor.name, 'Array');
    var tokens = instance._processTokens;
    // check the number of tokens in process instance and expected state
    if (typeof partialFlag === 'undefined' || partialFlag === false) {
      assert.strictEqual(Object.keys(tokens).length, expectedState.length);
    }
    for (var i = 0; i < expectedState.length; i++) {
      var expectedToken = expectedState[i];

      if (typeof expectedToken === 'string') {
        expectedToken = {
          name: expectedToken
        };
      }
      /* Assume default status as Complete, unless specified */
      expectedToken.status = expectedToken.status || 'complete';

      assert.isNotNull(expectedToken.name);
      var actualTokens = this.fetchMatchingTokens(instance, expectedToken);
      assert.isNotNull(actualTokens, 'Token not found for ' + expectedToken.name);
      assert.isArray(actualTokens);
      assert.isAtLeast(actualTokens.length, 1, 'No matching token found for ' + expectedToken.name);

      // eslint-disable-next-line
      actualTokens.forEach(function fecb(actualToken) {
        var unMatchedProp = 'DEFAULT';
        // eslint-disable-next-line
        var matchAllProps = Object.keys(expectedToken).every(function checkEachProperty(prop) {
          unMatchedProp = prop;
          return expectedToken[prop] === actualToken[prop];
        });
        var expectedVal = expectedToken[unMatchedProp];
        var actualVal = actualToken[unMatchedProp];
        var debugMessage = 'Property [' + unMatchedProp + '] for token [' + expectedToken.name + '] did not match. Expected [' + expectedVal + '], found [' + actualVal + '].';
        assert.isNotFalse(matchAllProps, debugMessage);
      });
    }
  },
  verifyFlow: function verifyFlow(instance, expectedFlow) {
    let processTokens = instance._processTokens;
    assert.strictEqual(Object.keys(processTokens).length, expectedFlow.length);
    let sortedTokens = Object.values(processTokens).sort((a, b) => a.startTime > b.startTime);
    for (var i = 0; i < sortedTokens.length; i++) {
      assert.strictEqual(sortedTokens[i].name, expectedFlow[i]);
      assert.strictEqual(sortedTokens[i].status, 'complete');
    }
  },
  verifyCompletionFlow: function verifyCompletionFlow(instance, expectedFlow) {
    let processTokens = instance._processTokens;
    assert.strictEqual(Object.keys(processTokens).length, expectedFlow.length);
    let sortedTokens = Object.values(processTokens).sort((a, b) => a.endTime > b.endTime);
    for (var i = 0; i < sortedTokens.length; i++) {
      assert.strictEqual(sortedTokens[i].name, expectedFlow[i]);
      assert.strictEqual(sortedTokens[i].status, 'complete');
    }
  },
  verifyPV: function vpv(instance, expectedPV) {
    var actualPV = instance._processVariables;
    return Object.keys(expectedPV).every(function matchAllProps(prop) {
      assert.deepEqual(actualPV[prop], expectedPV[prop]);
    });
  },
  verifyTimerCompletion: function vtc(instance, timerName, duration, delta) {
    delta = delta || 100;
    let startTimerToken = this.fetchTokenByName(instance, timerName);
    let startTime = new Date(startTimerToken.startTime);
    let endTime = new Date(startTimerToken.endTime);
    expect(endTime - startTime).to.be.closeTo(duration, delta, timerName + ' finished too early or took too long to finish');
  },
  verifyFlowNew: function vfn(instance, expectedFlow) {
    let current = new Date(Date.UTC(1970, 1, 1, 0, 0, 0, 0));
    let allTokens = Object.values(instance._processTokens);
    let lastFlow = '';
    let minStart;
    let maxEnd;
    expectedFlow.forEach(flowItem => {
      if (typeof flowItem === 'string') {
        flowItem = [flowItem];
      }

      minStart = null;
      maxEnd = null;
      let nextTokens = allTokens.filter(t => {
        if (flowItem.indexOf(t.name) >= 0) {
          let start = new Date(t.startTime);
          let end = new Date(t.endTime);
          if (!minStart || start < minStart) {
            minStart = start;
          }
          if (!maxEnd || end > maxEnd) {
            maxEnd = end;
          }
          return true;
        }
        return false;
      });
      expect(nextTokens.length).to.be.at.least(1);
      /* In some cases, next token is constructed BEFORE marking current token as complete
       * causing start-time of next token to be 1ms or 2ms BEFORE end-time of current token
       * Allow tolerance of 5milli-secconds */
      expect(minStart.getTime() - current.getTime()).to.be.above(-5, JSON.stringify(flowItem) + ' started before ' + JSON.stringify(lastFlow));
      current = maxEnd;
      lastFlow = flowItem;
    });
  },
  checkEachProperty: function checkEachProperty(obj1, obj2, properties) {
    /* Return if they are same reference or both undefined */
    if (obj1 === obj2) {
      return;
    }
    expect(obj1).to.exist;
    expect(obj2).to.exist;
    obj1 = obj1.toObject ? obj1.toObject() : obj1;
    obj2 = obj2.toObject ? obj2.toObject() : obj2;
    if (!properties || properties.length === 0) {
      properties = Object.keys(obj1);
    }
    properties.forEach(p => {
      let val1 = obj1[p];
      let val2 = obj2[p];
      if (typeof val1 === 'undefined') {
        val1 = null;
      }
      if (typeof val2 === 'undefined') {
        val2 = null;
      }
      expect(val1).to.deep.equal(val2, p + ' is not same ' + val1 + ' != ' + val2);
    });
  }
};
