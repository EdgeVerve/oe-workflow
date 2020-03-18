/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
/**
 * @description FlowObject Evaluator
 * @author Kangan Verma(kangan06), Mandeep Gill(mandeep6ill), Prem Sai(premsai-ch), Vivek Mittal(vivekmittal07)
 */

var loopback = require('loopback');
var logger = require('oe-logger');
var log = logger('BusinessRuleTask-Node');

var sandbox = require('./sandbox.js');

var exports = module.exports = {};

exports.businessRuleTaskHandler = function businessRuleTaskHandler(ruleName, mode, payload, message, process, options, done) {
  var model = loopback.getModel(mode, options);
  /* istanbul ignore if*/
  if (!model) {
    log.error(options, 'Rule engine is not enabled');
    return done(null, {
      error: {
        message: 'Rule engine is not enabled',
        retriable: false
      }
    });
  }

  let evalPayload = evaluatePayload(payload, message, process);
  ruleName = sandbox.evaluate$Expression(options, ruleName, message, process);
  if (mode === 'DecisionTable') {
    model.exec(ruleName, evalPayload, options, executeBusinessRuleCB);
  } else if (mode === 'DecisionService') {
    model.invoke(ruleName, evalPayload, options, executeBusinessRuleCB);
  } else if (mode === 'DecisionTree') {
    model.exec(ruleName, evalPayload, options, executeBusinessRuleCB);
  }

  function executeBusinessRuleCB(err, res) {
    let message = {
      documentName: ruleName,
      input: evalPayload
    };
    if (err) {
      log.error(options, err.message);
      message.error = {
        message: err.message || 'Unknown error while executing rules',
        retriable: err.retriable
      };
    }
    if (res) {
      message.output = res;
    }
    return done(null, message);
  }
};

var evaluatePayload = function evalPayload(inputData, message, process) {
  var self = this;
  var prop;

  for (prop in process._processVariables) {
    if (Object.prototype.hasOwnProperty.call(process._processVariables, prop)) {
      self[prop] = process._processVariables[prop];
    }
  }
  for (prop in message) {
    if (Object.prototype.hasOwnProperty.call(message, prop)) {
      self[prop] = message[prop];
    }
  }

  var payload = {};
  var value;
  for (prop in inputData) {
    if (Object.prototype.hasOwnProperty.call(inputData, prop)) {
      var propVal = inputData[prop];
      if (!(inputData[prop].constructor && (inputData[prop].constructor.name === 'Array' || inputData[prop].constructor.name === 'Object'))) {
        var propExp = inputData[prop].trim();
        if (propExp.startsWith('@script__')) {
          value = sandbox.evaluateExpression({}, propExp.replace('@script__', ''), message, process);
        } else {
          value = sandbox.evaluate$Expression({}, propExp, message, process);
          /* to support old functionality i.e. numbers or numerical expressions wihich are enclosed inside '${}'.
          now ideally numbers or numerical expressions no need to be enclosed in '${}' */
          if (propExp.startsWith('${') && propExp.endsWith('}')) {
            var newValue = parseFloat(value);
            if (!isNaN(newValue)) {
              value = newValue;
            }
          } else if (!isNaN(value)) {
            value = Number(value);
          } else if (value === 'true') {
            value = true;
          } else if (value === 'false') {
            value = false;
          }
        }
        payload[prop] = value;
      } else {
        payload[prop] = propVal;
      }
    }
  }

  for (prop in process._processVariables) {
    if (Object.prototype.hasOwnProperty.call(process._processVariables, prop)) {
      delete self[prop];
    }
  }
  for (prop in message) {
    if (Object.prototype.hasOwnProperty.call(message, prop)) {
      delete self[prop];
    }
  }

  return payload;
};
exports.evaluatePayload = evaluatePayload;
