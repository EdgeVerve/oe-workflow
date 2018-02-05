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
var vm = require('vm');

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
    return done(err);
  }
};

var evaluateJSON = function evaluateJSON(data, incomingMsg, process, options) {
  var sandbox = {
    msg: incomingMsg,
    pv: function pv(name) {
      if (name === 'accessToken') {
        return options.accessToken;
      }
      var val = process._processVariables[name];
      if (typeof val === 'undefined' && process._parentProcessVariables) {
        val = process._parentProcessVariables[name];
      }
      return val;
    },
    data: data,
    _output: null
  };

  var script = '_output = ' + data;
  // eslint-disable-next-line
  var context = new vm.createContext(sandbox);
  try {
    var compiledScript = new vm.Script(script);
    compiledScript.runInContext(context, { timeout: 1000 });
  } catch (e) {
    log.error(options, e);
    return e;
  }
  return sandbox._output;
};

module.exports.evaluateJSON = evaluateJSON;

/**
 * Evaluates Finalize Transaciton Connector
 * @param  {Object} options Options
 * @param  {Object} flowObject FlowObject
 * @param  {Object} message Message
 * @param  {Object} process Process-Instance
 * @param  {Function} done Callback
 */
function evaluateFTConnector(options, flowObject, message, process, done) {
  var variableType = flowObject.variableType;
  var status       = 'approved';

  if (variableType === 'ProcessVariable' || variableType === 'processvariable') {
    status = process._processVariables[flowObject.variableValue];
  } else if (variableType === 'Message' || variableType === 'message') {
    status = message[flowObject.variableValue];
  } else if (variableType === 'approve') {
    status = 'approved';
  } else if (variableType === 'reject') {
    status = 'rejected';
  }

  var WorkflowManager = loopback.getModel('WorkflowManager', options);
  var workflowInstanceId = process._processVariables._workflowInstanceId;

  var postData = {
    'workflowInstanceId': workflowInstanceId,
    'status': status
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
 */
function evaluateRestConnector(options, flowObject, message, process, token, done) {
  var pv = function pv(name) {
    var val = process._processVariables[name];
    if (typeof val === 'undefined' && token && token.inVariables) {
      var inVariables = token.inVariables;
      val = inVariables[name];
    }
    if (typeof val === 'undefined' && process._parentProcessVariables) {
      val = process._parentProcessVariables[name];
    }
    return val;
  };

  var accessToken = options.accessToken;
  // eslint-disable-next-line
  var access_token = options.accessToken;

  var msg = function msg(name) {
    return message[name];
  };

  log.debug(options, pv, accessToken, msg);

  var urlOptions = _.cloneDeep(flowObject.formData);

  // evaluating url
  // TODO : change eval to sandbox
  // eslint-disable-next-line
  var _url = eval('`' + urlOptions.url + '`');
  // urlOptions.url = _url;
  urlOptions.url = _url;

  // evaluating body
  if (urlOptions.json) {
    var _json;
    let expr = '_json = ' + urlOptions.json;

    // TODO : change eval to sandbox
    // eslint-disable-next-line
    eval(expr);
    urlOptions.json = _json;
  }
  // evaluating body
  if (urlOptions.headers) {
    var _headers;
    let expr = '_headers = ' + urlOptions.headers;

    // TODO : change eval to sandbox
    // eslint-disable-next-line
    eval(expr);
    urlOptions.headers = _headers;
  }

  var qs = flowObject.queryString;
  if (qs) {
    urlOptions.qs = qs;
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
      callback(err);
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
  var modelName = evaluateProp(flowObject.props.model, message, process, options);
  var operation = flowObject.props.method;
  try {
    var model = loopback.getModel(modelName, options);
  } catch (err) {
    log.error(options, err);
    return done(null, {
      error: err
    });
  }
  var id;
  var data;

  if (operation === 'create') {
    data = evaluateJSON(flowObject.props.data, message, process, options);
    model.create(data, options, function createMI(err, res) {
      if (err) {
        log.error(options, err);
        return done(null, {
          error: err
        });
      }
      return done(null, res.toObject());
    });
  } else if (operation === 'read') {
    // id = evaluateProp(flowObject.props.modelId, message, process, options);
    var filter = evaluateJSON(flowObject.props.filter, message, process, options);
    model.find(filter, options, function fetchMI(err, res) {
      if (err) {
        log.error(options, err);
        return done(null, {
          error: err
        });
      }
      var _res = [];
      for (var i = 0; i < res.length; i++) {
        _res.push(res[i].toObject());
      }
      return done(null, _res);
    });
  } else if (operation === 'update') {
    id = evaluateProp(flowObject.props.modelId, message, process, options);
    data = evaluateJSON(flowObject.props.data, message, process, options);
    data.id = id;
    model.upsert(data, options, function updateMI(err, res) {
      if (err) {
        log.error(options, err);
        return done(null, {
          error: err
        });
      }
      return done(null, res.toObject());
    });
  } else if (operation === 'delete') {
    id = evaluateProp(flowObject.props.modelId, message, process, options);
    var version = evaluateProp(flowObject.props.modelVersion, message, process, options);
    model.deleteWithVersion(id, version, options, function deleteMI(err, res) {
      if (err) {
        log.error(options, err);
        return done(null, {
          error: err
        });
      }
      return done(null, res);
    });
  }
}


function evaluateProp(data, incomingMsg, process, options) {
  // check if prop needs to be evaluated
  if (data && (data.indexOf('pv(') > -1 || data.indexOf('msg(') > -1)) {
    var script = '_output = ' + data;
  } else {
    return data;
  }

  var sandbox = {
    msg: function msg(name) {
      if (incomingMsg[name]) {
        return incomingMsg[name];
      }
      return null;
    },
    pv: function pv(name) {
      if (name === 'accessToken') {
        return options.accessToken;
      }
      var val = process._processVariables[name];
      if (typeof val === 'undefined' && process._parentProcessVariables) {
        val = process._parentProcessVariables[name];
      }
      return val;
    },
    data: data,
    _output: null
  };

  // eslint-disable-next-line
  var context = new vm.createContext(sandbox);
  try {
    var compiledScript = new vm.Script(script);
    compiledScript.runInContext(context, { timeout: 1000 });
  } catch (e) {
    log.error(options, e);
    return e;
  }
  return sandbox._output;
}
