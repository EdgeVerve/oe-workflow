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
 */
module.exports.run = function run(options, flowObject, message, process, token, done) {
  if (flowObject.isCustom) {
    evaluateCustomImplementation(options, flowObject, message, process, done);
  } else if (flowObject.connectorType && flowObject.connectorType === 'rest') {
    evaluateRestConnector(options, flowObject, message, process, token, done);
  } else if (flowObject.connectorType && flowObject.connectorType === 'finalizeTransaction') {
    evaluateFTConnector(options, flowObject, message, process, done);
  } else if (flowObject.connectorType && flowObject.connectorType === 'oeConnector') {
    evaluateOEConnector(options, flowObject, message, process, done);
  } else {
    evaluateCustomImplementation(options, flowObject, message, process, done);
  }
};

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
  var status = 'approved';

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
      return done(err);
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
  urlOptions.url = _url;

  // evaluating body
  if (urlOptions.json) {
    var _json;
    var expr = '_json = ' + urlOptions.json;

    // TODO : change eval to sandbox
    // eslint-disable-next-line
    eval(expr);
    urlOptions.json = _json;
  }

  var qs = flowObject.queryString;
  if (qs) {
    urlOptions.qs = qs;
  }

  // default timeout is now set to 20000 ms
  urlOptions.timeout = flowObject.timeout || 20000;

  // default number of retries set to 0
  var retries = flowObject.retries || 0;

  makeRESTCalls(urlOptions, retries, function callback(err, response) {
    if (err) {
      return done(err);
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
    var message = {
      urlOptions: urlOptions
    };
    message.error = err || 'undefined';
    message.body = body || 'undefined';
    if (response && response.statusCode) {
      message.statusCode = response.statusCode;
    } else {
      message.statusCode = 'undefined';
    }

    if (response && response.statusCode >= 500 && retry > 0) {
      log.debug(log.defaultContext(), 'making a retry attempt to url : ' + urlOptions.url);
      makeRESTCalls(urlOptions, retry - 1, callback);
    } else {
      // earlier body was available as message
      // now it will be message.body
      callback(null, message);
    }
  });
}
/**
 * Custom Function calling EVF Models
 * @param  {Object} options Options
 * @param  {Object} flowObject FlowObject
 * @param  {Object} message Message
 * @param  {Object} process Process-Instance
 * @param  {Function} done Callback
 */
function evaluateCustomImplementation(options, flowObject, message, process, done) {
  var method = flowObject.formData.method;
  var value = flowObject.formData.json;
  var attachedModelName = process._processVariables._attachedModelName;
  var attachedModel = loopback.getModel(attachedModelName, options);

  var attachedInstanceId = process._processVariables._attachedModelInstanceId;

  // TODO : separate Id and put try catch to save the server from crashing in case of invalid id
  attachedModel.findById(JSON.parse(attachedInstanceId), options, function callback(err, instance) {
    if (err) {
      return done(err);
    }
    var data = {};
    data[method] = value;
    if (instance._version) {
      data._version = instance._version;
    }
    instance.updateAttributes(data, options, function updateMI(err) {
      done(err, message);
    });
  });
}

/**
 * OE Connector for Workflow Engine
 * @param  {Object} options Options
 * @param  {Object} flowObject FlowObject
 * @param  {Object} message Message
 * @param  {Object} process Process-Instance
 * @param  {Function} done Callback
 */
function evaluateOEConnector(options, flowObject, message, process, done) {
  var modelName = evaluateProp(flowObject.props.model, message, process, options);
  var operation = flowObject.props.method;
  var model = loopback.getModel(modelName, options);
  var id;
  var data;

  if(modelName == 'ChangeRequest'){
    var updates = evaluateJSON(flowObject.props.data, message, process, options);
    var ChangeWorkflowRequest = loopback.getModel('ChangeWorkflowRequest', options);
    ChangeWorkflowRequest.find({
      where: {
        and: [{
          modelName: process._processVariables._modelInstance._type
        }, {
          modelId: process._processVariables._modelInstance.id
        }]
      }
    }, options, function fetchChangeModel(err, inst) {
      if (err) {
        log.error(ctx, err);
        return done(err);
      }
      if (inst.length > 1) {
        let err = new Error('Multiple instances found with same id in Change Workflow Request');
        log.error(ctx, err);
        return done(err);
      } else if (inst.length === 0) {
        // no instance found in change request model
        return done(null,{
          'change_request_update' : 'failed - no instance found'
        });
      }
      var instx = JSON.parse(JSON.stringify(inst[0].data));
      for (let key in updates) {
        if (Object.prototype.hasOwnProperty.call(updates, key)) {
          var val = updates[key];
          instx[key] = val;
        }
      }
      inst[0].updateAttributes({
        data : instx
      }, options, function updateCM(err, res){
        if(err){
          log.error(options, err);
          return done(err);
        }
        process._processVariables._modelInstance = instx;
        return done(null,{
          'change_request_update' : 'successful'
        });
      })
    });
    return;
  }

  if (operation === 'create') {
    data = evaluateJSON(flowObject.props.data, message, process, options);
    model.create(data, options, function createMI(err, res) {
      if (err) {
        log.error(options, err);
        return done(null, err);
      }
      return done(null, res.toObject());
    });
  } else if (operation === 'read') {
    // id = evaluateProp(flowObject.props.modelId, message, process, options);
    var filter = evaluateJSON(flowObject.props.filter, message, process, options);
    model.find(filter, options, function fetchMI(err, res) {
      if (err) {
        log.error(options, err);
        return done(null, err);
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
        return done(null, err);
      }
      return done(null, res.toObject());
    });
  } else if (operation === 'delete') {
    id = evaluateProp(flowObject.props.modelId, message, process, options);
    var version = evaluateProp(flowObject.props.modelVersion, message, process, options);
    model.deleteWithVersion(id, version, options, function deleteMI(err, res) {
      if (err) {
        log.error(options, err);
        return done(null, err);
      }
      return done(null, res);
    });
  }
}

function evaluateJSON(data, incomingMsg, process, options) {
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
