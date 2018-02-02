/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
/**
 * Implementation of Workflow definition
 * @author Kangan Verma(kangan06), Mandeep Gill(mandeep6ill), Nirmal Satyendra(iambns), Prem Sai(premsai-ch), Vivek Mittal(vivekmittal07)
 */

var bpmnParser = require('./lib/parsing/definitions');
var async = require('async');

var logger = require('oe-logger');
var log = logger('WorkflowDefinition');
const uuidv4 = require('uuid/v4');

module.exports = function WorkflowDefinition(WorkflowDefinition) {
  /**
   * Before Save Observer Hook
   */
  WorkflowDefinition.observe('before save', function beforeSaveWD(ctx, next) {
    var workflowDef = ctx.instance || ctx.data;
    // as we are working in before save , we generate id and use it as foreign key in Process Defn creation

    // All the updates needs to be done without any processing, updates can only happen for latest attribute of instance
    if (!ctx.isNewInstance) {
      return next();
    }

    // Any update to the workflow definition needs to be a create call with same name and updated xml defintion
    // check if the workflow is already present and this the update to that instance
    //

    WorkflowDefinition.find({
      'where': {'and':
      [
          {'name': workflowDef.name},
          {'latest': true}
      ]
      }
    }, ctx.options, function fetchLatestWFD(err, def) {
      if (err) {
        return next(err);
      }
      if (def.length === 0) {
          // New Definition needs to be created.
        workflowDef.setAttribute('latest', true);
        return createWorkflowDefinition(workflowDef, ctx, next);
      }
      if (def.length > 1) {
        return next(new Error('multiple Latest Workflow definitions found'));
      }
      if (def.length === 1) {
          // Update the instance returned and make the current workflow definition as latest
        workflowDef.setAttribute('latest', true);
        def[0].latest = false;
        WorkflowDefinition.upsert(def[0], ctx.options, function cb(cberr, res) {
          if (cberr) {
            return next(new Error('The old defintion could not be updated'));
          }
          return createWorkflowDefinition(workflowDef, ctx, next);
        });
      } else {
        return next(err);
      }
    });
  });


  function createWorkflowDefinition(workflowDef, ctx, next) {
    var workflowDefId;
    if (!workflowDef.hasOwnProperty('id')) {
      workflowDefId = uuidv4();
    } else {
      workflowDefId = workflowDef.id;
    }
    if (ctx.instance && ctx.instance.setAttribute) {
      ctx.instance.setAttribute('id', workflowDefId);
    }
    workflowDef.id = workflowDefId;

    // TODO need to check if all the instances for the process definition are ended
    if (workflowDef && workflowDef.name && workflowDef.xmldata) {
      var xmldata = workflowDef.xmldata;
      if (typeof xmldata === 'undefined') {
        var err = new Error('ProcessDefinition data not provided');
        log.error(ctx.options, err);
        return next(err);
      }

      bpmnParser.getBPMNDefinitionsFromXML(xmldata, workflowDef.name, function getBPMNDefinitionsFromXMLCB(bpmnDefinitionsErr, bpmnDefinitions) {
        if (bpmnDefinitionsErr) {
          log.error(ctx.options, bpmnDefinitionsErr);
          return next(bpmnDefinitionsErr);
        }
        var collaborationDef = bpmnDefinitions.collaborationDef;
        var processDefinitions = bpmnDefinitions.processDefinitions;
        for (var i in collaborationDef) {
          if (Object.prototype.hasOwnProperty.call(collaborationDef, i)) {
            workflowDef[i] = collaborationDef[i];
          }
        }
        if (workflowDef.unsetAttribute) {
          workflowDef.unsetAttribute('xmldata');
        }
        if (!collaborationDef) {
          return createProcessDefinition(workflowDef, ctx.options, workflowDef.name, processDefinitions[0], {}, next);
        }

        async.each(workflowDef.participants,
                validateExternalDefinition.bind(null, ctx.options, processDefinitions), function participant(err) {
                  if (err) {
                    return next(err);
                  }
                  async.each(processDefinitions, createPoolDefinition.bind(null, workflowDefId, ctx.options, workflowDef), function poolDefinition(err) {
                    return next(err);
                  });
                });
      });
    } else {
      var dataError = new Error('Data not present');
      log.error(ctx.options, dataError);
      return next(dataError);
    }
  }

    /**
     * Validate External Process Defintion
     * @param   {Object}   options               Options
     * @param   {[Object]}   processDefinitions  Process-Definitions
     * @param   {Object}   participant           Participant
     * @param   {Function} callback              Callback
     * @returns {void}
     */
  function validateExternalDefinition(options, processDefinitions, participant, callback) {
    for (var i in processDefinitions) {
      if (participant.processRef === processDefinitions[i].bpmnId) {
        return callback();
      }
    }
    var ProcessDefinition = WorkflowDefinition.app.models.ProcessDefinition;
    // var filter = [{'name': participant.name}, {'latest': true}];
    ProcessDefinition.find({
      'where': {'name': participant.name}
    }, options, function fetchPD(err, def) {
      if (err) {
        return callback(err);
      }
      if (def.length === 0) {
        return callback(new Error('Pool definition not deployed'));
      }
      // No multiple pool definition check because of versioning system
      callback(err);
    });
  }

    /**
     * Create Pool Definition
     * @param  {Object}   workflowDefId         Workflow-Definition Id
     * @param  {Object}   options               Options
     * @param  {Object}   workflowDef           Workflow-Definition
     * @param  {Object}   processDefinition     Process-Definition
     * @param  {Function} callback              Callback
     */
  function createPoolDefinition(workflowDefId, options, workflowDef, processDefinition, callback) {
    var name = workflowDef.name + '$' + processDefinition.name;
    var messageFlows = workflowDef.messageFlows;
    var messageFlowsBySrcProcess = _buildFlowIndex(messageFlows, 'sourceProcessDefinitionId');

    for (var j in workflowDef.participants) {
      if (Object.prototype.hasOwnProperty.call(workflowDef.participants, j)) {
        var participant = workflowDef.participants[j];
        if (participant.processRef === processDefinition.bpmnId) {
          participant.name = name;
        }
      }
    }
    createProcessDefinition(workflowDef, options, name, processDefinition, messageFlowsBySrcProcess, callback);
  }

    /**
     * Create Process definition
     * @param  {Object}   workflowDefId             WorkflowDefId
     * @param  {Object}   options                   Options
     * @param  {String}   name                      Workflow-Definition Name
     * @param  {Object}   processDefinition         Process-Definition
     * @param  {[Object]} messageFlowsBySrcProcess  MessageFlows
     * @param  {Function} callback                  Callback
     */
  function createProcessDefinition(workflowDef, options, name, processDefinition, messageFlowsBySrcProcess, callback) {
    // var processDef = {
    //   'name': name,
    //   'parsedDef': processDefinition,
    //   'workflowDefinitionId': workflowDefId
    // };
    // var ProcessDefinition = WorkflowDefinition.app.models.ProcessDefinition;
    // var query = [{'name': name}, {'workflowDefinitionId': workflowDefId}];
    // ProcessDefinition.find({'where': {'and': query}}, options, function cb(fetchErr, res) {
    //   if (!fetchErr) {
    //     var processDefVersion = res[0]._version;
    //     processDef._version = processDefVersion;
    //     processDef.messageFlowsBySrcProcess = messageFlowsBySrcProcess;
    //     ProcessDefinition.upsert(processDef, options, function createPD(err, def) {
    //       if (err && err.message === 'Duplicate entry for ' + ProcessDefinition.name) {
    //         return callback(null, def);
    //       }
    //       return callback(err);
    //     });
    //   }
    // });
    var processDef = {
      'name': name,
      'parsedDef': processDefinition,
      'workflowDefinitionId': workflowDef.id
    };
    if(workflowDef.bpmndataId){
      processDef.bpmndataId = workflowDef.bpmndataId;
    }
    processDef.messageFlowsBySrcProcess = messageFlowsBySrcProcess;
    var ProcessDefinition = WorkflowDefinition.app.models.ProcessDefinition;
    ProcessDefinition.create(processDef, options, function createPD(err, def) {
      if (err && err.message === 'Duplicate entry for ' + ProcessDefinition.name) {
        return callback(null, def);
      }
      callback(err);
    });
  }

    /**
     * Build Flow Index
     * @param  {Object} flows       MessageFlows
     * @param  {String} indexByRef  Reference
     * @return {Object}             IndexMap
     */
  function _buildFlowIndex(flows, indexByRef) {
    var index = {};
    flows.forEach(function iterateFlows(flow) {
      var ref = flow[indexByRef];
      var entry = index[ref];

      if (entry) {
        entry.push(flow);
      } else {
        index[ref] = [flow];
      }
    });
    return index;
  }
};
