/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
/**
 * @description Timeouts handler for Workflow
 * @author Kangan Verma(kangan06), Mandeep Gill(mandeep6ill), Prem Sai(premsai-ch), Vivek Mittal(vivekmittal07)
 */

var logger = require('oe-logger');
var log = logger('Timeouts');
var throwObject = require('./throwobject');

/**
 * Constructor for Timeout
 * @param {Integer}  timeoutInMs        Timeout
 * @param {Boolean}  isRelative         IsRelative
 */
function Timeout(timeoutInMs, isRelative) {
  var at;
  var now;

  if (isRelative) {
    now = Date.now();
    at = now + timeoutInMs;
  } else {
    at = timeoutInMs;
  }

  this.at = at;
  this.timeout = timeoutInMs;
}

/**
 * Remove Timeout
 * @param  {Object} delta           Process-State-Delta
 * @param  {String} timerEventName  TimerEvent Name
 */
var removeTimeout = exports.removeTimeout = function removeTimeout(delta, timerEventName) {
  delta.removePendingTimeout(timerEventName);
};

/**
 * Remove Interval Timer
 * @param  {Object} delta           Process-State-Delta
 * @param  {Strinf} timerEventName  TimerEvent Name
 */
exports.removeTimer = function removeTimer(delta, timerEventName) {
  delta.removePendingTimer(timerEventName);
};

/**
 * Remove all Timeouts except explicitly mentioned
 * @param  {Object} ProcessInstance     Process-Instance
 * @param  {Integer} timerToKeep        Timer Id
 */
exports.removeAllTimeouts = function removeAllTimeouts(ProcessInstance, timerToKeep) {
  ProcessInstance._processTimerEvents.pendingTimeouts = {};

  var timeoutIds = ProcessInstance._processTimerEvents.timeoutIds;
  for (var i in timeoutIds) {
    if (Object.prototype.hasOwnProperty.call(timeoutIds, i)) {
      clearTimeout(timeoutIds[i]);
    }
  }
  ProcessInstance._processTimerEvents.timeoutIds = {};

  for (i in ProcessInstance._processTimerEvents.timerIds) {
    if (i === timerToKeep) {
      // TODO : why startTimer is used but not referenced
      var startTimer = ProcessInstance._processTimerEvents.timerIds[i];
      log.debug(log.defaultContext(), startTimer);
    } else {
      clearInterval(ProcessInstance._processTimerEvents.timerIds[i]);
    }
  }
  ProcessInstance._processTimerEvents.timerIds = {timerToKeep: ProcessInstance._processTimerEvents.timerIds[timerToKeep]};
};

 /**
  * Add Boundary Timer Event
  * @param {Object} delta               Process-State-Delta
  * @param {Object} options             Options
  * @param {Object} ProcessInstance     Process-Instance
  * @param {Object} currentProcess      currentProcess
  * @param {Object} timerEvent          TimerEvent
  */
exports.addBoundaryTimerEvent = function addBoundaryTimerEvent(delta, options, ProcessInstance, currentProcess, timerEvent) {
  var timerEventName = timerEvent.name;
  var timerEventHandler = function timerEventHandler(delta) {
    log.debug(options, "Caught boundary timer event: '" + timerEvent.name + "'.");
    if (timerEvent.timeDuration) {
      removeTimeout(delta, timerEventName);
    }
    // we only have the knowledge about the name corresponding to the token that was created
    currentProcess.reload(options, function fetchLatestPI(err, currentProcess) {
      if (err) {
        // unable to fetch the latest instance
        log.error(options, err);
        return;
      }
      var payload = throwObject.throwObject('timer', timerEventName);
      ProcessInstance.emit('INTERMEDIATE_CATCH_EVENT', options, ProcessInstance, currentProcess, payload, delta );
    });
  };

  addTimerEvent(delta, timerEvent, timerEventHandler);
};

 /**
  * Add Start Timer Event
  * @param {Object} delta               Process-State-Delta
  * @param {Object} options             Options
  * @param {Object} ProcessInstance     Process-Instance
  * @param {Object} currentProcess      currentProcess
  * @param {Object} timerEvent          TimerEvent
  */
exports.addStartTimerEvent = function addStartTimerEvent(delta, options, ProcessInstance, currentProcess, timerEvent) {
  var timerEventName = timerEvent.name;
  var timerEventHandler = function timerEventHandler(delta) {
    log.debug(options, "Caught startTimer event: '" + timerEvent.name + "'.");

    if (timerEvent.timeDuration) {
      // removeTimeout(ProcessInstance,timerEventName); //TODO we will need to handle tokens for interval
      removeTimeout(delta, timerEventName);
    }
    var payload = throwObject.throwObject('timer', timerEventName);
    ProcessInstance.emit('INTERMEDIATE_CATCH_EVENT', options, ProcessInstance, currentProcess, payload, delta );
  };

  addTimerEvent(delta, timerEvent, timerEventHandler);
};

 /**
  * Add Intermediate Timer Event
  * @param {Object} delta               Process-State-Delta
  * @param {Object} options             Options
  * @param {Object} ProcessInstance     Process-Instance
  * @param {Object} currentProcess      currentProcess
  * @param {Object} timerEvent          TimerEvent
  */
exports.addIntermediateTimerEvent = function addIntermediateTimerEvent(delta, options, ProcessInstance, currentProcess, timerEvent ) {
  var timerEventName = timerEvent.name;
  var timerEventHandler = function timerEventHandler(delta) {
    log.debug(options, "Caught intermediate timer event: '" + timerEvent.name + "'.");
    // remove the timerEvent only if it is a timeout
    if (timerEvent.timeDuration) {
      // removeTimeout(ProcessInstance,timerEventName); //TODO we will need to handle tokens for interval
      removeTimeout(delta, timerEventName);
    }
    // we only have the knowledge about the name corresponding to the token that was created
    currentProcess.reload(options, function fetchLatestPI(err, currentProcess) {
      if (err) {
        // unable to fetch the latest instance
        log.error(options, err);
        return;
      }
      var payload = throwObject.throwObject('timer', timerEventName);
      ProcessInstance.emit('INTERMEDIATE_CATCH_EVENT', options, ProcessInstance, currentProcess, payload, delta );
    });
  };

  addTimerEvent(delta, timerEvent, timerEventHandler);
};

/**
 * Add Timer Event
 * @param {Object} delta                Process-State-Delta
 * @param {Object} timerEvent           TimerEvent
 * @param {Object} timeoutEventHandler  Callback
 */
var addTimerEvent = exports.addTimerEvent = function addTimerEvent(delta, timerEvent, timeoutEventHandler) {
  var timerEventName = timerEvent.name;
  // timeDuration - Schedules one time execution for timer event
  // timeCycle    - Schedules repeated execution for timer event

  var timeoutInMs = timerEvent.timeDuration || timerEvent.timeCycle;
  var timeout;
  var now;
  var diff;
  var cb = function cb() {
    timeoutEventHandler(delta);
  };

  if (isNaN(timeoutInMs)) {
    log.error(log.defaultContext(), "The getTimeout handler '" + timerEventName + "' does not return a number but '" + timeoutInMs + "'");
  }  else if (timerEvent.timeDuration) {
    timeout = new Timeout(timeoutInMs, true);
    // Timeout is created to keep track of Timer Events

    delta.setPendingTimeouts(timerEventName, timeout);

    now = Date.now();
    // calculating again to handle pending timeout
    diff = timeout.at - now;

    if (diff > 0) {
      log.debug(log.defaultContext(), "Set timer for '" + timerEventName + "'. Timeout: " + diff);

      setImmediate(function afterNextTick() {
        delta.setTimeoutId(timerEventName, setTimeout( cb, diff));
      });
    } else {
      cb();
    }
  }    else {
    timeout = new Timeout(timeoutInMs, true);
    delta.setPendingTimeouts(timerEventName, timeout);

    now = Date.now();
    // calculating again to handle pending timeout
    diff = timeout.at - now;

    if (diff > 0) {
      log.debug(log.defaultContext(), "Set timer for '" + timerEventName + "'. Timeout: " + diff);
      delta.setTimerId(timerEventName, setInterval(cb, diff));
      // TODO token management might be required as token will created but should not be removed
    } else {
      log.error(log.defaultContext(), 'Negative timer specified');
    }
  }
};
