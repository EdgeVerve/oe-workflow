/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
/**
 * @description  Sandbox related evaluations
 * @author Kangan Verma(kangan06), Mandeep Gill(mandeep6ill), Prem Sai(premsai-ch), Vivek Mittal(vivekmittal07)
 */

var vm = require('vm');
var _ = require('lodash');

var logger = require('oe-logger');
var log = logger('Sandbox');

/**
 * Execute a script inside Sandbox
 * @param  {[type]} options     [description]
 * @param  {[type]} script      [description]
 * @param  {[type]} incomingMsg [description]
 * @param  {[type]} process     [description]
 * @param  {[type]} delta       [description]
 * @param  {[type]} token       [description]
 * @return {[type]}            [description]
 */
module.exports.evaluateScript = function evaluateScript(options, script, incomingMsg, process, delta, token) {
  // Might need to clone the inputVariables
  var message;
  var updates = {
    set: {},
    unset: {}
  };

  var sandbox = {
    _msg: incomingMsg,
    _setPV: function _setPV(name, value) {
      delta.addProcessVariable(name, value);
    },
    _getPV: function _getPV(name) {
      if (name === 'accessToken' || name === 'access_token') {
        return options.accessToken;
      }

      /**
       * Priority level - 1st Process Variable,
       *                  2nd Local Variable
       *                  3rd Parent Process Variable
       */
      var val = process._processVariables[name];
      if (typeof val === 'undefined' && token && token.inVariables) {
        var inVariables = token.inVariables;
        val = inVariables[name];
      }
      if (typeof val === 'undefined' && process._parentProcessVariables) {
        val = process._parentProcessVariables[name];
      }

      return val;
    },
    _sendMsg: function _sendMsg(msg) {
      message = msg;
    },
    _instance: {
      setAttribute: function setAttribute(key, val) {
        updates.set[key] = val;
        if (updates.unset[key]) {
          delete updates.unset[key];
        }
      },
      unsetAttribute: function unsetAttribute(key) {
        updates.unset[key] = true;
        if (updates.set[key]) {
          delete updates.set[key];
        }
      },
      setAttributes: function setAttributes(obj) {
        for (var key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key)) {
            var val = obj[key];
            sandbox._instance.setAttribute(key, val);
          }
        }
      },
      unsetAttributes: function unsetAttributes(obj) {
        for (var key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key)) {
            if (obj[key] === true) {
              sandbox._instance.unsetAttribute(key);
            }
          }
        }
      },
      toObject: function toObject() {
        var obj = _.cloneDeep(process._processVariables._modelInstance);
        var key;
        // apply updates
        for (key in updates.set) {
          if (Object.prototype.hasOwnProperty.call(updates.set, key)) {
            obj[key] = updates.set[key];
          }
        }
        for (key in updates.unset) {
          if (Object.prototype.hasOwnProperty.call(updates.unset, key) && obj[key]) {
            delete obj[key];
          }
        }
        return obj;
      }
    }
  };

  // eslint-disable-next-line
  var context = new vm.createContext(sandbox);
  try {
    var compiledScript = new vm.Script(script);
    compiledScript.runInContext(context, { timeout: 2000 });

    // persist updates to the process Variables
    delta.addProcessVariable('_updates', updates);
  } catch (e) {
    log.error(options, e);
    return { error: e };
  }

  return { msg: message };
};

module.exports.evaluateExpressions = function evalExpressions(options, expressions, msg, process, inVariables) {
  var sandbox = {
    _output: {},
    msg: msg,
    options: options,
    accessToken: options.accessToken,
    pv: function pv(name) {
      if (inVariables && inVariables[name]) {
        return inVariables[name];
      }
      return process._processVariables[name];
    },
    _msg: msg,
    _getPV: function _getPV(name) {
      console.warn(depMessage);
      if (inVariables && inVariables[name]) {
        return inVariables[name];
      }
      return process._processVariables[name];
    }
  };

  let results = [];
  // eslint-disable-next-line
  var context = new vm.createContext(sandbox);
  try {
    expressions.forEach(v => {
      if (v) {
        vm.runInContext('_output = ' + v, context, {
          timeout: 500
        });
        results.push(sandbox._output);
      } else {
        results.push(v);
      }
    });
  } catch (e) {
    log.error(options, e);
    throw e;
  }
  return results;
};

module.exports.evaluateExpression = function evalExpression(options, expression, msg, process, inVariables) {
  var sandbox = {
    _output: {},
    options: options,
    pv: function pv(name) {
      if (inVariables && inVariables[name]) {
        return inVariables[name];
      }
      return process._processVariables[name];
    },
    accessToken: options.accessToken,
    access_token: options.accessToken,
    msg: msg,
    _getPV: function _getPV(name) {
      // To be DEPRECATED soon, Please use pv and msg instead of _getPV and _msg in expressions
      let depMessage = '[TO BE DEPRECATED SOON]: Please update _getPV and _msg with pv and msg in Expressions.';
      // eslint-disable-next-line
      console.log(depMessage);
      if (inVariables && inVariables[name]) {
        return inVariables[name];
      }
      return process._processVariables[name];
    },
    _msg: msg
  };

  var evalExpression = '_output = ' + expression;

  // eslint-disable-next-line
  var context = new vm.createContext(sandbox);
  try {
    var compiledScript = new vm.Script(evalExpression);
    compiledScript.runInContext(context, { timeout: 500 });
  } catch (e) {
    log.error(options, e);
    throw e;
    // return e;
  }
  return sandbox._output;
};

module.exports.evaluateDirect = function evaluateDirect(options, expression, message, process, inVariables) {
  var sandbox = {};

  // Process Variables will have priority over message
  message = message || {};
  Object.keys(message).forEach(prop => {
    sandbox[prop] = message[prop];
  });
  process._processVariables = process._processVariables || {};
  Object.keys(process._processVariables).forEach(prop => {
    sandbox[prop] = process._processVariables[prop];
  });

  var evalExpression = '_output = ' + expression;

  // eslint-disable-next-line
  var context = new vm.createContext(sandbox);
  try {
    var compiledScript = new vm.Script(evalExpression);
    compiledScript.runInContext(context, { timeout: 500 });
  } catch (e) {
    log.error(options, e);
    throw e;
    // return e;
  }
  return sandbox._output;
};

module.exports.evaluate$Expression = function eval$Expression(options, expression, msg, process, token) {
  var prop;
  var sandbox = {
    msg: {},
    _output: null
  };

  for (prop in process._processVariables) {
    if (Object.prototype.hasOwnProperty.call(process._processVariables, prop)) {
      sandbox[prop] = JSON.parse(JSON.stringify(process._processVariables[prop]));
    }
  }

  // additionaly overide with local variables
  if (token && token.inVariables) {
    var inVariables = token.inVariables;
    for (prop in inVariables) {
      if (Object.prototype.hasOwnProperty.call(inVariables, prop)) {
        sandbox[prop] = _.cloneDeep(inVariables[prop]);
      }
    }
  }

  for (prop in msg) {
    if (Object.prototype.hasOwnProperty.call(msg, prop)) {
      sandbox.msg[prop] = _.cloneDeep(msg[prop]);
    }
  }

  // eslint-disable-next-line
  var context = new vm.createContext(sandbox);
  try {
    var compiledScript = new vm.Script('_output = `' + expression + '`');
    compiledScript.runInContext(context, { timeout: 500 });
  } catch (e) {
    log.error(options, e);
    return null;
  }
  return sandbox._output;
};
