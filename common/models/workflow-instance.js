/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
/**
 * Implementation of Workflow-Instance
 * @author Kangan Verma(kangan06), Mandeep Gill(mandeep6ill), Nirmal Satyendra(iambns), Prem Sai(premsai-ch), Vivek Mittal(vivekmittal07)
 */

var async = require('async');

var logger = require('oe-logger');
var log = logger('WorkflowInstance');
var loopback = require('loopback');

module.exports = function WorkflowInstance(WorkflowInstance) {
  function handleError(err, options, onlyMessage, callback) {
    if (!callback && typeof onlyMessage === 'function') {
      callback = onlyMessage;
      onlyMessage = false;
    }
    log.error(options, onlyMessage ? err.message : err);
    return callback(err);
  }
  /**
   * Before Save hook Workflow Instance
   */
  WorkflowInstance.observe('before save', function afterSaveWI(ctx, next) {
    if (ctx.isNewInstance) {
      var workflowDefinitionName = ctx.instance.workflowDefinitionName;
      var WorkflowDefinition = loopback.getModel('WorkflowDefinition', ctx.options);

      WorkflowDefinition.find({
        'where': {
          'and': [{
            'name': workflowDefinitionName
          },
          {
            'latest': true
          }
          ]
        }
      }, ctx.options, function fetchWD(err, wdefns) {
        /* istanbul ignore if*/
        if (err) {
          return handleError(err, ctx.options, next);
        } else if (wdefns.length === 0) {
          return handleError(new Error(workflowDefinitionName + ': No latest workflow definition found'), ctx.options, next);
        } else if (wdefns.length > 1) {
          return handleError(new Error('Multiple latest workflow definitions found with the same name'), ctx.options, next);
        }
        var inst = wdefns[0];
        var id = inst.id;
        ctx.instance.setAttribute('workflowDefinitionId', id);
        next();
      });
    } else {
      next();
    }
  });

  /**
   * After Save Observer Hook
   */
  WorkflowInstance.observe('after save', function afterSaveWI(ctx, next) {
    if (ctx.isNewInstance) {
      var instance = ctx.instance;
      instance.workflowDefinition({}, ctx.options, function fetchWD(err, workflowDefinition) {
        /* istanbul ignore if*/
        if (err) {
          return handleError(err, ctx.options, true, next);
        }
        if (!workflowDefinition) {
          return next(new Error('Process definition not present'));
        }
        if (workflowDefinition.isCollaborationDefinition) {
          instance.createCollaborationProcesses(workflowDefinition.participants, ctx.options, next);
        } else {
          instance.createProcess(workflowDefinition.name, ctx.options, next);
        }
      });
    } else {
      next();
    }
  });

  /**
   * Create Collaboration Process
   * @param  {[Object]} participants   Participants
   * @param  {Object}   options        Options
   * @param  {Function} next           Callback
   */
  WorkflowInstance.prototype.createCollaborationProcesses = function createCollaborationProcesses(participants, options, next) {
    var self = this;
    async.each(participants, function iterateParticipants(participant, done) {
      if (participant.name.indexOf('$') > 0 && participant.name.indexOf('$') < participant.name.length) {
        self.createProcess(participant.name, options, done);
      } else {
        self.createParticipantProcess(participant.name, options, done);
      }
    }, function callback(err) {
      next(err);
    });
  };

  /**
   * Create Process Instance
   * @param  {String}   name     Process-Definition Name
   * @param  {Object}   options  Options
   * @param  {Function} next     Callback
   * @returns {void}
   */
  WorkflowInstance.prototype.createProcess = function createProcess(name, options, next) {
    var self = this;
    var processVariables = {};
    if (typeof self.processVariables !== 'undefined' && self.processVariables) {
      try {
        processVariables = JSON.parse(JSON.stringify(self.processVariables));
      } catch (e) {
        return handleError(e, options, next);
      }
    }

    // if (typeof self.id === 'object') {
    //   // conversion for _bsonType is really required ?
    //   processVariables._workflowInstanceId = self.id.toString();
    // } else {
    //   processVariables._workflowInstanceId = self.id;
    // }

    processVariables._workflowInstanceId = self.id;

    var postData = {
      'processDefinitionName': name,
      'processVariables': processVariables,
      'message': self.message,
      'workflowInstanceId': self.id
    };

    var processDefinitionName = postData.processDefinitionName;
    var ProcessDefinition = loopback.getModel('ProcessDefinition', options);

    var filter = {
      'and': [{
        'name': processDefinitionName
      }, {
        'workflowDefinitionId': self.workflowDefinitionId
      }]
    };
    ProcessDefinition.find({
      'where': filter
    }, options, function fetchWD(err, pdefns) {
      /* istanbul ignore if*/
      if (err) {
        return handleError(err, options, next);
      } else if (pdefns.length === 0) {
        return handleError(new Error(processDefinitionName + ': No Latest process definition found'), options, next);
      } else if (pdefns.length > 1) {
        return handleError(new Error('Multiple Latest process definitions found with the same name'), options, next);
      }
      var inst = pdefns[0];
      var id = inst.id;
      postData.processDefinitionName = inst.name;
      postData.processDefinitionId = id;
      self.processes.create(postData, options, next);
    });
  };

  /**
   * Create Process Instance
   * @param  {String}   name     Process-Definition Name
   * @param  {Object}   options  Options
   * @param  {Function} next     Callback
   * @returns {void}
   */
  WorkflowInstance.prototype.createParticipantProcess = function createParticipantProcess(name, options, next) {
    var self = this;
    var processVariables = {};
    if (typeof self.processVariables !== 'undefined' && self.processVariables) {
      try {
        processVariables = JSON.parse(JSON.stringify(self.processVariables));
      } catch (e) {
        return handleError(e, options, next);
      }
    }

    processVariables._workflowInstanceId = self.id;

    var postData = {
      'processDefinitionName': name,
      'processVariables': processVariables,
      'message': self.message,
      'workflowInstanceId': self.id
    };

    var processDefinitionName = postData.processDefinitionName;
    var ProcessDefinition = loopback.getModel('ProcessDefinition', options);
    var WorkflowDefinition = loopback.getModel('WorkflowDefinition', options);

    WorkflowDefinition.find({
      'where': {
        'and': [{
          'name': processDefinitionName
        },
        {
          'latest': true
        }
        ]
      }
    }, options, function fetchWD(err, wdefns) {
      /* istanbul ignore if*/
      if (err) {
        return handleError(err, options, next);
      } else if (wdefns.length === 0) {
        return handleError(new Error(processDefinitionName + ': No latest workflow definition found'), options, next);
      }
      ProcessDefinition.find({
        'where': {
          'and': [{
            'name': processDefinitionName
          },
          {
            'workflowDefinitionId': wdefns[0].id
          }
          ]
        }
      }, options, function fetchWD(err, pdefns) {
        /* istanbul ignore if*/
        if (err) {
          return handleError(err, options, next);
        } else if (pdefns.length === 0) {
          return handleError(new Error(processDefinitionName + ': No Latest process definition found'), options, next);
        } else if (pdefns.length > 1) {
          return handleError(new Error('Multiple Latest process definitions found with the same name'), options, next);
        }
        var inst = pdefns[0];
        var id = inst.id;
        postData.processDefinitionName = inst.name;
        postData.processDefinitionId = id;
        self.processes.create(postData, options, next);
      });
    });
  };


  /*
   * Pass a message to an execution that is waiting for a matching message
   * and can be correlated according using the Message Reference and the ParticipantName of the Collaboration process
   */
  WorkflowInstance.prototype.passInternalMessageByRef = function passInternalMessageByRef(participantName, messageRef, message) {

  };

  /**
   * Pass a message to an execution that is waiting for a mataching message and
   * and can be correlated directly with BPMN Id present in the message flow
   * @param  {Object} processDefId   Process-Definition Name
   * @param  {String} flowObjectId   FlowObject Name
   * @param  {Object} options        Options
   * @param  {Object} message        Message
   */
  WorkflowInstance.prototype.passInternalMessage = function passInternalMessage(processDefId, flowObjectId, options, message) {
    this.processes({}, options, function fetchProcesses(err, processes) {
      /* istanbul ignore if*/
      if (err) {
        log.error(options, err);
      }

      var passFlag = false;
      for (var i in processes) {
        if (Object.prototype.hasOwnProperty.call(processes, i) && processes[i].processDefinitionBpmnId === processDefId) {
          processes[i]._recieveMessage(options, flowObjectId, message);
          passFlag = true;
          break;
        }
      }

      if (!passFlag) {
        log.error(options, 'No process instance with Process Definition Id ' + processDefId + ' found.');
      }
    });
  };

  /*
   * Pass a message to an execution that is waiting for a mataching message and
   * and can be correlated according to the businessKey that is basically the WorkflowInstance Identifier
   * and messageRef to look for the corresponding Recieve Task/Message Event
   */
  WorkflowInstance.prototype.passExternalMessage = function passExternalMessage(businessKey, messageRef, message) {
    // this will be exposed as a remote method
  };

  WorkflowInstance.remoteMethod('terminate', {
    accepts: [{
      arg: 'workflowId',
      type: 'string'
    }, {
      arg: 'options',
      type: 'object',
      http: 'optionsFromRequest'
    }],
    returns: {
      arg: 'ack',
      type: 'string'
    }
  });

  WorkflowInstance.terminate = function terminate(workflowId, options, callback) {
    var app = WorkflowInstance.app;
    var ProcessInstance = app.models.ProcessInstance;

    WorkflowInstance.findById(workflowId, options, function fetchWI(err, workflowInstance) {
      /* istanbul ignore if*/
      if (err) {
        return handleError(err, options, callback);
      }

      workflowInstance.processes({}, options, function fetchProcesses(err, Processes) {
        /* istanbul ignore if*/
        if (err) {
          return handleError(err, options, callback);
        }
        for (var i in Processes) {
          if (Object.prototype.hasOwnProperty.call(Processes, i)) {
            ProcessInstance.emit('PROCESS_TERMINATE', options, ProcessInstance, Processes[i]);
          }
        }

        let updates = {
          _version: workflowInstance._version,
          status: 'terminated'
        };
        workflowInstance.updateAttributes(updates, options, function saveWI(err, res) {
          /* istanbul ignore if*/
          if (err) {
            return handleError('Unable to update status to terminate', options, callback);
          }
          // console.log('Triggering ', res.workflowDefinitionName+'-terminated');
          WorkflowInstance.emit(res.workflowDefinitionName + '-terminated', res);
          callback(null, 'Request for workflowInstance Termination sent');
        });
      });
    });
  };
};
