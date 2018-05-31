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

exports.businessRuleTaskHandler = function businessRuleTaskHandler(ruleName, payload, message, process, options, done) {
  var modelName = 'DecisionTable';
  var model = loopback.getModel(modelName, options);
  var evalPayload = evaluatePayload(payload, message, process);

  model.exec(ruleName, evalPayload, options, function execBR(err, res) {
    var message = {
      documentName: ruleName,
      data: evalPayload
    };
    if (err) {
      log.error(options, err);
      message.error = err.message ? err.message : 'Error message not defined. Please check service with data.';
    }
    if (res) {
      message.body = res;
    }
    return done(null, message);
  });
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
  for (prop in inputData) {
    if (Object.prototype.hasOwnProperty.call(inputData, prop)) {
      var propVal = inputData[prop];
      if (!(inputData[prop].constructor && (inputData[prop].constructor.name === 'Array' || inputData[prop].constructor.name === 'Object'))) {
        var propExp = inputData[prop].trim();
        /* ${..} not required for evaluateExpression. (Older eval needed it)
           Strip ${...} wrapper if present, for backward compatibility*/
        if (propExp.startsWith('${') && propExp.endsWith('}')) {
          propExp = propExp.substr(2, propExp.length - 3);
          let depMessage = '[TO BE DEPRECATED SOON]: Please remove the ${...} wrapper from expression';
          // eslint-disable-next-line
          console.log(depMessage);
        }
        payload[prop] = sandbox.evaluateExpression({}, propExp, message, process);
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
