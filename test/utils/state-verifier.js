var chai = require('chai');
var assert = chai.assert;

module.exports = {
  isPending: function iP(instance) {
    assert.strictEqual(instance._status, 'pending');
  },
  isFailed: function iF(instance) {
    assert.strictEqual(instance._status, 'failed');
  },
  isComplete: function iC(instance) {
    assert.strictEqual(instance._status, 'complete');
  },
  fetchTokenByName: function ft(instance, name) {
    var tokens = instance._processTokens;
    var token = Object.keys(tokens).filter(function filterByTokenName(tokenId) {
      return tokens[tokenId].name === name ? true : false;
    });
    return token.length === 1 ? tokens[token[0]] : null;
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
      var expectToken = expectedState[i];
      assert.isNotNull(expectToken.name);
      var actualToken = this.fetchTokenByName(instance, expectToken.name);
      assert.isNotNull(actualToken);
      // now match props
      var unMatchedProp = 'DEFAULT';
      // eslint-disable-next-line
      var matchAllProps = Object.keys(expectToken).every(function checkEachProperty(prop) {
        unMatchedProp = prop;
        return expectToken[prop] === actualToken[prop];
      });
      var expectedVal = expectToken[unMatchedProp];
      var actualVal = actualToken[unMatchedProp];
      var debugMessage = 'Property [' + unMatchedProp + '] for token [' + expectToken.name + '] did not match. Expected [' + expectedVal + '], found [' + actualVal + '].';
      assert.isNotFalse(matchAllProps, debugMessage);
    }
  },
  verifyPV: function vpv(instance, expectedPV) {
    var actualPV = instance._processVariables;
    return Object.keys(expectedPV).every(function matchAllProps(prop) {
      return typeof actualPV[prop] !== 'undefined' && actualPV[prop] === expectedPV[prop];
    });
  }
};
