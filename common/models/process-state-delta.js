/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
/**
 * Implementation of Process-State-Delta
 * @author Kangan Verma(kangan06), Mandeep Gill(mandeep6ill), Prem Sai(premsai-ch), Vivek Mittal(vivekmittal07)
 */

var logger = require('oe-logger');
var log = logger('ProcessStateDelta');

var _ = require('lodash');
var sandbox = require('./lib/workflow-nodes/sandbox.js');

var Delta = module.exports = function Delta() {
  this.tokens = [];
  this.processVariables = {};
  this.processTimerEvents = {
    pendingTimeouts: {},
    endedTimeouts: {},
    timeoutIds: {},
    timerIds: {}
  };
  this.tokensToInterrupt = [];
};

Delta.prototype.setTokenToFail = function setTokenToFail(tokenId, error) {
  this.tokenToFail = tokenId;
  this.error = error;
};

Delta.prototype.addToken = function addToken(token) {
  this.tokens.push(token);
};

Delta.prototype.setTokenToRemove = function setTokenToRemove(tokenId) {
  this.tokenToRemove = tokenId;
};

Delta.prototype.setTokenToPending = function setTokenToPending(tokenId) {
  this.tokensToPending = [tokenId];
};

Delta.prototype.setTokenToTerminate = function setTokenToTerminate(tokenId) {
  this.tokenToTerminate = tokenId;
};

Delta.prototype.setTokenToInterrupt = function setTokenToInterrupt(tokenId) {
  this.tokensToInterrupt.push(tokenId);
};

Delta.prototype.setPGToEnd = function setPGToFinish(gwId) {
  this.pgToEnd = gwId;
};

Delta.prototype.setPGSeqToFinish = function setPGSeqToFinish(gwId, seqFlow, refToken) {
  this.pgSeqToFinish = {
    gwId: gwId,
    seqFlow: seqFlow,
    refToken: refToken
  };
};

Delta.prototype.setPGSeqsToExpect = function setPGSeqsToExpect(gwId, seqFlows) {
  this.pgSeqsToExpect = {
    gwId: gwId,
    seqFlows: seqFlows
  };
};

Delta.prototype.addProcessVariable = function addProcessVariable(name, value) {
  this.processVariables[name] = value;
};

Delta.prototype.setProcessVariables = function setProcessVariables(variables) {
  this.processVariables = variables || {};
};

Delta.prototype.setProcessStatus = function setProcessStatus(status) {
  this.processStatus = status;
};

Delta.prototype.setIsForceEndToken = function setIsForceEndToken() {
  this.isForceEndToken = true;
};

Delta.prototype.setIsEndToken = function setIsEndToken() {
  this.isEndToken = true;
};

Delta.prototype.setPendingTimeouts = function setPendingTimeouts(name, val) {
  val._createdAt = new Date();
  this.processTimerEvents.pendingTimeouts[name] = val;
};

Delta.prototype.setTimeoutId = function setTimeoutId(name, val) {
  this.processTimerEvents.timeoutIds[name] = val;
};

Delta.prototype.setTimerId = function setTimerId(name, val) {
  this.processTimerEvents.timerIds[name] = val;
};

Delta.prototype.removePendingTimeout = function removePendingTimeout(name) {
  var _completedAt = new Date();
  if (this.processTimerEvents.removePendingTimeouts) {
    this.processTimerEvents.removePendingTimeouts.push({ name: name, _completedAt: _completedAt });
  }    else {
    this.processTimerEvents.removePendingTimeouts = [{ name: name, _completedAt: _completedAt }];
  }
};

Delta.prototype.removePendingTimer = function removePendingTimer(name) {
  var _completedAt = new Date();
  if (this.processTimerEvents.removePendingTimers) {
    this.processTimerEvents.removePendingTimers.push({ name: name, _completedAt: _completedAt });
  }    else {
    this.processTimerEvents.removePendingTimers = [{ name: name, _completedAt: _completedAt }];
  }
};


/**
* Try to apply the changes to the process instance.
* Return null if the changes cannot be applied
 * @param  {Process-Instance} zInstance Instance
 * @param  {Options} options Options
 * @returns {Object} Updates
 */
Delta.prototype.apply = function apply(zInstance, options) {
  // check why this failes with error items must be an array
  // var instance = _.cloneDeep(zInstance.toObject(true));
  var instance = JSON.parse(JSON.stringify(zInstance.toObject(true)));
  var tokens = instance._processTokens;
  var processVariables = instance._processVariables;
  var processTimerEvents = instance._processTimerEvents;
  var synchronizeFlow = instance._synchronizeFlow;

  this.updateProcessTimerEvents(processTimerEvents);

  var i;

    // TODO need to remove the throwing exception in release.
  if (instance._status === 'complete') {
        // throw Error("Trying to change state in a completed process");
    log.debug(log.defaultContext(), 'Trying to change state in a completed process.');
    return null;
  }

  if (instance._status === 'interrupted') {
    log.debug(log.defaultContext(), 'Trying to change state in an interrupted process.');
    return null;
  }

  var currentToken = tokens[this.tokenToRemove];
  var setTocomplete = true;

  if (currentToken && currentToken.status !== 'pending') {
    /**
     * trying to update status of token to 'complete' while its already complete
     * can happen due to parallel updates or interruption
    */
    return null;
  }

  /**
  * In case of multiinstance new tokens only need to be added if all the instances
  * have been created and completed
  **/
  if (currentToken && currentToken.isParallel) {
    currentToken.nrOfActiveInstances--;
    currentToken.nrOfCompleteInstances++;
    if (currentToken.nrOfActiveInstances !== 0) {
      setTocomplete = false;
    }
  } else if (currentToken && currentToken.isSequential) {
    currentToken.nrOfActiveInstances--;
    currentToken.nrOfCompleteInstances++;
    if (currentToken.nrOfCompleteInstances !== currentToken.nrOfInstances) {
      currentToken.nrOfActiveInstances = 1;
      setTocomplete = false;
    }
  }

  for (i in this.processVariables) {
    if (Object.prototype.hasOwnProperty.call(this.processVariables, i)) {
      processVariables[i] = this.processVariables[i];
    }
  }

  /**
   * In case completion condition was defined, we also have to evaluate completion condition
   * And in case we complete the token, we have to make sure in case of user task, we should interrupt task
   * and in case of subprocess we interrupt sub process
   */
  if (currentToken && currentToken.hasCompletionCondition && setTocomplete === false) {
    try {
      // update token invariables with nrOfCompleteInstances, nrOfActiveInstances, nrOfInstances
      let _token = _.cloneDeep(currentToken);
      _token.inVariables = _token.inVariables || {};
      _token.inVariables.nrOfActiveInstances = _token.nrOfActiveInstances;
      _token.inVariables.nrOfCompleteInstances = _token.nrOfCompleteInstances;
      _token.inVariables.nrOfInstances = _token.nrOfInstances;
      let _eval = sandbox.evaluate$Expression(options, _token.completionCondition, _token.message, instance, _token);
      if (_eval === true || _eval === 'true') {
        // completion condition evaluated to be true
        setTocomplete = true;
      }
    } catch (ex) {
      // unable to evaluate complete condition, will be ignored
      log.error(options, new Error('Unable to evaluate completion condition.'));
    }
  }

  // reverting tokens to pending in case of retry
  if (this.tokensToPending) {
    this.tokensToPending.forEach( t => {
      tokens[t].status = 'pending';
      delete tokens[t].error;
    });
  }

  if (setTocomplete) {
    var res = this.applyTokens(tokens, synchronizeFlow);
    if (res === null) {
      return null;
    }
  }
  var status = '_status';

  if (this.pgSeqsToExpect && typeof synchronizeFlow[this.pgSeqsToExpect.gwId] === 'undefined') {
    var sfObj = {};
    var sFlows = this.pgSeqsToExpect.seqFlows;
    for (var k = 0; k < sFlows.length; k++) {
      var sf = sFlows[k];
      sfObj[sf] = null;
    }
    synchronizeFlow[this.pgSeqsToExpect.gwId] = sfObj;
  }

  if (this.pgSeqToFinish) {
    synchronizeFlow[this.pgSeqToFinish.gwId][this.pgSeqToFinish.seqFlow] = this.pgSeqToFinish.refToken;
  }

  var updates = {
    '_processVariables': processVariables,
    '_processTimerEvents': processTimerEvents,
    '_processTokens': tokens,
    '_version': instance._version,
    '_synchronizeFlow': synchronizeFlow,
    'id': instance.id
  };

  if (this.processStatus) {
    updates[status] = this.processStatus;
  }

  var processEnded;
  if (this.isEndToken) {
    processEnded = true;
    for (i in tokens) {
      if (Object.prototype.hasOwnProperty.call(tokens, i)) {
        var token = tokens[i];
        if (token.status !== 'complete' && token.status !== 'interrupted' ) {
          processEnded = false;
        }
      }
    }
  }

  if (this.isForceEndToken || this.processStatus === 'interrupted') {
    // interrupting all pending tokens in cased of Terminate event
    // or Sub-Process as a whole when its interrupted
    interruptAllTokens(updates._processTokens);
  }

  updates['passive-wait'] = true;
  // backward compatibility in ci
  Object.values = function values(obj) {
    return Object.keys(obj).map( key => {
      return obj[key];
    });
  };
  Object.values(updates._processTokens).forEach(token => {
    if (token.bpmnId.indexOf('UserTask') !== 0) {
      if (token.status === 'pending') {
        updates['passive-wait'] = false;
      }
    }
  });

  if (processEnded || this.isForceEndToken) {
    updates[status] = 'complete';
    // passive wait can't be true if process is already complete
    updates['passive-wait'] = false;
  }
  if (this.revertProcessToPending) {
    updates[status] = 'pending';
  }

  return updates;
};

Delta.prototype.applyTokens = function applyTokens(tokens, synchronizeFlow) {
  for (var i in this.tokens) {
    if (Object.prototype.hasOwnProperty.call(this.tokens, i)) {
      var t = this.tokens[i];
      tokens[t.id] = t;
    }
  }

  if (this.tokenToFail && tokens[this.tokenToFail]) {
    var token = tokens[this.tokenToFail];
    token.status = 'failed';
    token.error = this.error;
    token.endTime = new Date();
  }
    /**
     * If token to remove is Parallel Gateway token, complete other parallel gateway tokens also * * * those which are waiting
     */
  if (this.tokenToRemove && tokens[this.tokenToRemove] && tokens[this.tokenToRemove].meta && tokens[this.tokenToRemove].meta.type === 'ParallelGateway') {
    var gwId = tokens[this.tokenToRemove].meta.gwId;
    var tokenObjs = synchronizeFlow[gwId];
    for (var tk in tokenObjs) {
      if (Object.prototype.hasOwnProperty.call(tokenObjs, tk)) {
        var tkId = tokenObjs[tk];
        tokens[tkId].status = 'complete';
        tokens[tkId].endTime = new Date();
      }
    }
  }  else  if (this.tokenToRemove) {
    tokens[this.tokenToRemove].status = 'complete';
    tokens[this.tokenToRemove].endTime = new Date();

    if (typeof tokens[this.tokenToRemove].meta !== 'undefined' && tokens[this.tokenToRemove].meta.type === 'EventGateway') {
      interruptMultipleTokens(tokens[this.tokenToRemove].meta.tokensToInterrupt, tokens);
    }
  }

  if (this.tokenToTerminate) {
    if (tokens[this.tokenToTerminate].status !== 'pending') {
      return null;
    }
    tokens[this.tokenToTerminate].status = 'interrupted';
    tokens[this.tokenToTerminate].endTime = new Date();
  }

  if (this.tokensToInterrupt.length > 0) {
    for (var x = 0; x < this.tokensToInterrupt.length; x++) {
      var tokenId = this.tokensToInterrupt[x];
      if (tokens[tokenId].status !== 'pending') {
        // while updating boundary event, we might not be able to interrupt due to some other process, should never come though
        log.error(log.defaultContext(), 'unable to interrupt token > ' + tokens[tokenId].name);
        continue;
      }
      tokens[tokenId].status = 'interrupted';
      tokens[tokenId].endTime = new Date();
    }
  }

  return tokens;
};

function interruptAllTokens(tokens) {
  for (var i in tokens) {
    if (Object.prototype.hasOwnProperty.call(tokens, i) && tokens[i].status === 'pending') {
      tokens[i].status = 'interrupted';
      tokens[i].endTime = new Date();
    }
  }
}

function interruptMultipleTokens(tokenNames, tokens) {
  for (var i in tokens) {
    if (Object.prototype.hasOwnProperty.call(tokens, i) && tokenNames.indexOf(tokens[i].name) > -1) {
      var tokenId = tokens[i].id;
      if (tokens[tokenId] && tokens[tokenId].status !== 'pending') {
        return null;
      }
      tokens[tokenId].status = 'interrupted';
      tokens[tokenId].endTime = new Date();
      delete tokens[tokenId].meta;
    }
  }
}

/**
 * Updates state changes for Timer Objects to Process Instance
 * @param  {Object} processTimerEvents Process-Timer-Events
 */
Delta.prototype.updateProcessTimerEvents = function updateProcessTimerEvents(processTimerEvents) {
  var i;
  var timerEventName;

  var pendingTimeouts = this.processTimerEvents.pendingTimeouts;
  for ( i in this.processTimerEvents.pendingTimeouts) {
    if (Object.prototype.hasOwnProperty.call(pendingTimeouts, i)) {
      processTimerEvents.pendingTimeouts[i] = pendingTimeouts[i];
    }
  }

  var timeoutIds = this.processTimerEvents.timeoutIds;
  for ( i in timeoutIds ) {
    if (Object.prototype.hasOwnProperty.call(timeoutIds, i)) {
      processTimerEvents.timeoutIds[i] = timeoutIds[i];
    }
  }

  var timerIds = this.processTimerEvents.timerIds;
  for ( i in timeoutIds) {
    if (Object.prototype.hasOwnProperty.call(timerIds, i)) {
      processTimerEvents.timerIds[i] = timerIds[i];
    }
  }

  var removePendingTimeouts = this.processTimerEvents.removePendingTimeouts;
  for ( i in removePendingTimeouts) {
    if (Object.prototype.hasOwnProperty.call(removePendingTimeouts, i)) {
      timerEventName = removePendingTimeouts[i].name;
      if (!processTimerEvents.pendingTimeouts[timerEventName] || !processTimerEvents.timeoutIds[timerEventName]) {
        log.debug(log.defaultContext(), 'Corresponding timer details for ' + timerEventName + ' not present.');
      }
      processTimerEvents.endedTimeouts[timerEventName] = processTimerEvents.pendingTimeouts[timerEventName];
      processTimerEvents.endedTimeouts[timerEventName]._completedAt = removePendingTimeouts[i]._completedAt;
      delete processTimerEvents.pendingTimeouts[timerEventName];
      clearTimeout(processTimerEvents.timeoutIds[timerEventName]);
      delete processTimerEvents.timeoutIds[timerEventName];
    }
  }

  var removePendingTimers = this.processTimerEvents.removePendingTimers;
  for ( i in removePendingTimers) {
    if (Object.prototype.hasOwnProperty.call(removePendingTimeouts, i)) {
      timerEventName = removePendingTimers[i];
      if (!processTimerEvents.pendingTimeouts[timerEventName] || !processTimerEvents.timerIds[timerEventName]) {
        // situation where timeout was not even created because the time duration was negative
        log.debug(log.defaultContext(), 'Corresponding timer details for ' + timerEventName + ' not present.');
      }
      processTimerEvents.endedTimeouts[timerEventName] = processTimerEvents.pendingTimeouts[timerEventName];
      processTimerEvents.endedTimeouts[timerEventName]._completedAt = removePendingTimeouts[i]._completedAt;
      delete processTimerEvents.pendingTimeouts[timerEventName];
      clearInterval(processTimerEvents.timerIds[timerEventName]);
      delete processTimerEvents.timerIds[timerEventName];
    }
  }
};
