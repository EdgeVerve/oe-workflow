/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
/**
 * @description  Implementation of Service Node
 * @author Kangan Verma(kangan06), Mandeep Gill(mandeep6ill), Prem Sai(premsai-ch), Vivek Mittal(vivekmittal07)
 */

var request = require('request');
var loopback = require('loopback');
var _ = require('lodash');
var sandbox = require('./sandbox.js');

var logger = require('oe-logger');
var log = logger('Service-Node');

/**
 * Common Interface to execute Connectors
 * @param  {Object} options Options
 * @param  {Object} flowObject FlowObject
 * @param  {Object} message Message
 * @param  {Object} process Process-Instance
 * @param  {Object} token Token
 * @param  {Function} done Callback
 * @returns  {void}
 */
module.exports.run = function run(options, flowObject, message, process, token, done) {
  if (flowObject.connectorType && flowObject.connectorType === 'rest') {
    evaluateRestConnector(options, flowObject, message, process, token, done);
  } else if (flowObject.connectorType && flowObject.connectorType === 'finalizeTransaction') {
    evaluateFTConnector(options, flowObject, message, process, done);
  } else if (flowObject.connectorType && flowObject.connectorType === 'oeConnector') {
    evaluateOEConnector(options, flowObject, message, process, done);
  } else {
    let err = new Error('Invalid connector type found.');
    log.error(options, err);
    return done(null, {error: err});
  }
};

// var evaluateJSON = function evaluateJSON(data, incomingMsg, process, options) {
//   var sandbox = {
//     msg: incomingMsg,
//     pv: function pv(name) {
//       if (name === 'accessToken') {
//         return options.accessToken;
//       }
//       var val = process._processVariables[name];
//       if (typeof val === 'undefined' && process._parentProcessVariables) {
//         val = process._parentProcessVariables[name];
//       }
//       return val;
//     },
//     data: data,
//     _output: null
//   };

//   if (typeof data !== 'string') {
//     data = JSON.stringify(data);
//   }
//   var script = '_output = ' + data;
//   // eslint-disable-next-line
//   var context = new vm.createContext(sandbox);
//   try {
//     var compiledScript = new vm.Script(script);
//     compiledScript.runInContext(context, { timeout: 1000 });
//   } catch (e) {
//     log.error(options, e);
//     return e;
//   }
//   return sandbox._output;
// };

// module.exports.evaluateJSON = evaluateJSON;

/**
 * Evaluates Finalize Transaciton Connector
 * @param  {Object} options Options
 * @param  {Object} flowObject FlowObject
 * @param  {Object} message Message
 * @param  {Object} process Process-Instance
 * @param  {Function} done Callback
 */
function evaluateFTConnector(options, flowObject, message, process, done) {
  var variableType = flowObject.variableType ? flowObject.variableType.toLowerCase() : '';
  var status       = 'approved';

  if (variableType === 'processvariable') {
    status = process._processVariables[flowObject.variableValue];
  } else if (variableType === 'message') {
    status = message[flowObject.variableValue];
  } else if (variableType === 'approve') {
    status = 'approved';
  } else if (variableType === 'reject') {
    status = 'rejected';
  }

  var WorkflowManager = loopback.getModel('WorkflowManager', options);
  var workflowInstanceId = process._processVariables._workflowInstanceId;

  var postData = {
    workflowInstanceId: workflowInstanceId,
    status: status
  };

  if (process._processVariables._updates) {
    postData.updates = process._processVariables._updates;
  }

  if (process._processVariables._maker_checker_impl === 'v2') {
    postData.version = 'v2';
  }

  WorkflowManager.endAttachWfRequest(postData, options, function completeMakerCheckerRequest(err, res) {
    if (err) {
      log.error(err);
      return done(null, {
        error: err
      });
    }
    var msg;
    if (res.constructor.name === 'Object') {
      // in case of create rejected it will return count : 1 after deleting and the returned response will not be Model Constructor
      msg = res;
    } else {
      msg = res.toObject();
    }
    msg.statusSent = status;
    done(null, msg);
  });
}

/**
 * Evaluates URL before making the REST call
 * @param  {Object} options Options
 * @param  {Object} flowObject FlowObject
 * @param  {Object} message Message
 * @param  {Object} process Process-Instance
 * @param  {Object} token Token
 * @param  {Function} done Callback
 * @returns  {void}
 */
function evaluateRestConnector(options, flowObject, message, process, token, done) {
  var urlOptions = _.cloneDeep(flowObject.formData);

  // evaluating url, headers & json
  try {
    /* ORIGINAL
    // if (urlOptions.url) {
    //   urlOptions.url = sandbox.evaluateExpression(options, '`' + urlOptions.url + '`', message, process);
    // }
    // if (urlOptions.method) {
    //   urlOptions.method = sandbox.evaluateExpression(options, '`' + urlOptions.method + '`', message, process);
    // }
    // if (urlOptions.headers) {
    //   urlOptions.headers = sandbox.evaluateExpression(options, urlOptions.headers, message, process);
    // }
    // if (urlOptions.json) {
    //   urlOptions.json = sandbox.evaluateExpression(options, urlOptions.json, message, process);
    // }
    */

    /* Proposed */
    let keys = [];
    let expressions = [];
    if (urlOptions.url) {
      keys.push('url');
      expressions.push('`' + urlOptions.url + '`');
    }
    if (urlOptions.method) {
      keys.push('method');
      expressions.push('`' + urlOptions.method + '`');
    }
    if (urlOptions.headers) {
      keys.push('headers');
      expressions.push(urlOptions.headers);
    }
    if (urlOptions.json) {
      keys.push('json');
      expressions.push(urlOptions.json);
    }

    let results = sandbox.evaluateExpressions(options, expressions, message, process);
    keys.forEach( (k, i) => {
      urlOptions[k] = results[i];
    });
    /* ENd Proposed */
  } catch (err) {
    return done(null, {
      error: err
    });
  }

  // default timeout is now set to 20000 ms
  urlOptions.timeout = flowObject.timeout || 20000;

  // default number of retries set to 0
  var retries = flowObject.retries || 0;

  if (urlOptions.url && urlOptions.url.indexOf('http') !== 0) {
    urlOptions.baseUrl = 'http://localhost:3000/';
  }
  makeRESTCalls(urlOptions, retries, function callback(err, response) {
    if (err) {
      log.error(options, err);
      return done(null, {
        error: err
      });
    }
    done(null, response);
  });
}

/**
 * Make REST calls
 * @param  {Object} urlOptions UrlOptions
 * @param  {Number} retry Retry
 * @param  {Function} callback Callback
 */
function makeRESTCalls(urlOptions, retry, callback) {
  request(urlOptions, function makeRequest(err, response, body) {
    if (err) {
      return callback(err);
    }
    var message = {
      urlOptions: urlOptions
    };
    message.body = body || 'undefined';
    if (response && response.statusCode) {
      message.statusCode = response.statusCode;
    } else {
      message.statusCode = 'undefined';
    }
    if (response && response.statusMessage) {
      message.statusMessage = response.statusMessage;
    }

    if (response && response.statusCode >= 500 && retry > 0 ) {
      log.debug(log.defaultContext(), 'making a retry attempt to url : ' + urlOptions.url);
      makeRESTCalls(urlOptions, retry - 1, callback);
    } else {
      // earlier body was available as message
      // now it will be message.body
      if (message.statusCode >= 400) {
        let err;
        try {
          err = JSON.parse(message.body);
          if (err.error) {
            err = err.error;
          }
        } catch (ex) {
          err = message;
        }
        return callback(err);
      }
      callback(null, message);
    }
  });
}

/**
 * OE Connector for Workflow Engine
 * @param  {Object} options Options
 * @param  {Object} flowObject FlowObject
 * @param  {Object} message Message
 * @param  {Object} process Process-Instance
 * @param  {Function} done Callback
 * @returns  {void}
 */
function evaluateOEConnector(options, flowObject, message, process, done) {
  let results = sandbox.evaluateExpressions(options, ['`' + flowObject.props.model + '`', '`' + flowObject.props.method + '`', flowObject.props.data], message, process);
  let modelName = results[0];
  let operationName = results[1];
  let operationArguments = results[2];
  let model;
  try {
    model = loopback.getModel(modelName, options);
  } catch (err) {
    log.error(options, err);
    return done(null, {
      error: err
    });
  }
  if (!model) {
    return done(null, {error: new Error('Invalid model ' + modelName )});
  }
  let operation = model[operationName];
  if (!operation || typeof operation !== 'function') {
    return done(null, {error: new Error('Invalid operation ' + operationName + ' on model ' + modelName )});
  }

  let evalCB = function evalCB(err, result) {
    if (err) {
      log.error(options, err);
      return done(null, {
        error: err
      });
    }

    if (result && Array.isArray(result)) {
      result = result.map(v => {
        return (typeof v.toObject === 'function') ? v.toObject() : v;
      });
    } else if (result && typeof result === 'object' && typeof result.toObject === 'function') {
      result = result.toObject();
    }
    return done(null, result);
  };

  if (!Array.isArray(operationArguments)) {
    operationArguments = [operationArguments];
  }
  // operationArguments.push(options);
  operationArguments.push(evalCB);

  operation.apply(model, operationArguments);

  // var modelName = evaluateProp(flowObject.props.model, message, process, options);
  // // var modelName = flowObject.props.model;
  // var operation = flowObject.props.method;
  // try {
  //   var model = loopback.getModel(modelName, options);
  // } catch (err) {
  //   log.error(options, err);
  //   return done(null, {
  //     error: err
  //   });
  // }
  // var data = flowObject.props.data || {};
  // if (operation && model && model[operation]) {
  //   data = evaluateJSON(data, message, process, options);
  //   model[operation](data[0], options, function evalCB(err, res) {
  //     if (err) {
  //       log.error(options, err);
  //       return done(null, {
  //         error: err
  //       });
  //     }
  //     var result = res;
  //     if (result && typeof result === 'object' && result.constructor.name !== 'Array') {
  //       if (typeof result.toObject !== 'undefined') {
  //         return done(null, result.toObject());
  //       }
  //       return done(null, result);
  //     }
  //     var _res = [];
  //     for (var i = 0; i < res.length; i++) {
  //       _res.push(res[i].toObject());
  //     }
  //     return done(null, _res);
  //   });
  // } else {
  //   return done(null, {error: new Error('Invalid operation ' + operation + ' on model ' + modelName )});
  // }
}
