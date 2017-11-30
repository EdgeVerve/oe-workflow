/**
*
* ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
* Bangalore, India. All Rights Reserved.
*
*/
var chai = require('chai');
var assert = chai.assert;

// This is to verify the final token state of the process
exports.verifyFlow = function callback(processTokens, expectedFlow) {
  assert.strictEqual(Object.keys(processTokens).length, expectedFlow.length);
  var j = 0;
  for (var i in processTokens) {
    if (Object.prototype.hasOwnProperty.call(processTokens, i)) {
      assert.strictEqual( processTokens[i].name, expectedFlow[j]);
      // assert.strictEqual( processTokens[i].status, "complete");
      assert.notEqual(processTokens[i].status, 'pending', 'Process state is bad.');
      j++;
    }
  }
};

// This is to verify the final token state of the process
// the sequence of tokens now doesn't matter, because sequence can't be ensured in json object
exports.verifyTokens = function callback(processTokens, expectedTokens) {
  // firstly, verify if the number of tokens are same
  assert.strictEqual(Object.keys(processTokens).length, expectedTokens.length);

  // assuming token name is unqiue in a process, that is all flow objects are named differently
  var expectedTokensNameMap = {};
  for (var j = 0; j < expectedTokens.length; j++) {
    expectedTokensNameMap[expectedTokens[j].name] = expectedTokens[j];
  }

  for (var i in processTokens) {
    if (Object.prototype.hasOwnProperty.call(processTokens, i)) {
      var expectedToken = expectedTokensNameMap[processTokens[i].name];
      assert.isNotNull(expectedToken);
      assert.strictEqual( processTokens[i].name, expectedToken.name);
      assert.strictEqual( processTokens[i].status, expectedToken.status);
      if (processTokens[i].nrOfCompleteInstances) {
        assert.strictEqual(processTokens[i].nrOfCompleteInstances, expectedToken.nrOfCompleteInstances);
      }
      j++;
    }
  }
};

// This is to verify the process variables of a process
exports.verifyProcessVariables = function callback(processVariables, expectedVariables ) {
  for (var i in expectedVariables) {
    if (Object.prototype.hasOwnProperty.call(expectedVariables, i)) {
      assert.deepEqual(expectedVariables[i], processVariables[i]);
    }
  }
};

/*
* Note: Never to use this if tasks of same name exist;
*/
exports.verifyTasks = function callback(processTasks, expectedTasks) {
  var expectedTaskOrder = [];
  var i;

  assert.strictEqual(processTasks.length, expectedTasks.length);

  for (i = 0; i < expectedTasks.length; i++) {
    var found = false;
    var task;
    for (var j = 0; j < processTasks.length; j++) {
      if (expectedTasks[i].name === processTasks[j].name) {
        found = true;
        task = processTasks[j];
        assert.strictEqual( processTasks[j].status, expectedTasks[i].status);
        break;
      }
    }
    assert.equal(true, found);
    expectedTaskOrder.push(task);
  }
  for (i = 0; i < expectedTaskOrder.length; i++) {
    processTasks[i] = expectedTaskOrder[i];
  }
};
