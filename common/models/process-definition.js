/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
/**
 * @description Implementation of Process Definition
 * @author Kangan Verma(kangan06), Mandeep Gill(mandeep6ill), Nirmal Satyendra(iambns), Prem Sai(premsai-ch), Vivek Mittal(vivekmittal07)
 */

var logger = require('oe-logger');
var log = logger('ProcessDefinition');

/**
 * @param  {Object} ProcessDefinition Process-Definition
 */
module.exports = function ProcessDefinition(ProcessDefinition) {
  ProcessDefinition.observe('before save', function beforeSavePD(ctx, next) {
    var processDef = ctx.instance || ctx.data;
    // TODO need to check if all the instances for the process definition are ended
    // TODO PI2 move messageFlowsBySrcProcess inside parsedDef rather than passing it as separate prop ['strict']
    if (processDef && processDef.name && processDef.parsedDef) {
      try {
        var parsedDef = processDef.parsedDef;
        log.debug(JSON.stringify(parsedDef, null, '\t'));
        var processDefinition = parsedDef;
        if (processDef.unsetAttribute) {
          processDef.unsetAttribute('parsedDef');
        }
        var externalMessageFlowBySrcProcess = processDef.messageFlowsBySrcProcess || {};
        if (processDef.unsetAttribute) {
          processDef.unsetAttribute('messageFlowsBySrcProcess');
        }
        var i = 0;
        var flowObjects = processDefinition.flowObjects;

        /* Check for missing names */
        let missingNames = flowObjects.filter(fo => !fo.name).map(fo => `${fo.type}/${fo.bpmnId}`);
        if (missingNames.length > 0) {
          return next({
            status: 422,
            message: 'Specify name for all flow nodes'
          });
        }
        /* Check for duplicate names */
        /* whlie checking for duplicate names, ignore link events */
        let nonLinkflowObjects = flowObjects.filter(fo => !fo.isLinkEvent);
        let nameCount = nonLinkflowObjects.map(fo => fo.name).reduce((s, foName) => {
          s[foName] = s[foName] || 0;
          s[foName] = s[foName] + 1;
          return s;
        }, {});
        if (Object.values(nameCount).find(n => n > 1)) {
          return next({
            status: 422,
            message: 'Flow node names must be unique'
          });
        }

        var createSubProcess = function createSubProcess(err) {
          if (err) {
            return next(err);
          }
          if (i < flowObjects.length) {
            var flowObject = flowObjects[i];
            i++;
            if (flowObject.isSubProcess) {
              flowObject.subProcessId = processDef.name + '$' + flowObject.name;
              var subProcessDef = {
                'name': flowObject.subProcessId,
                'parsedDef': flowObject.processDefinition,
                'parentProcessDefinitionId': processDef.id,
                'workflowDefinitionId': processDef.workflowDefinitionId
              };
              if (processDef.bpmndataId) {
                subProcessDef.bpmndataId = processDef.bpmndataId;
              }
              delete flowObject.processDefinition;

              ProcessDefinition.create(subProcessDef, ctx.options, createSubProcess);
            } else if (flowObject.isCallActivity) {
              // validation won't be done here because Call Activity name might be dynamically evaluated
              createSubProcess();
            } else {
              createSubProcess();
            }
          } else {
            // We have to create all the indexes for the current processDefinition
            // TODO this will increase the process definition size , need to rethink this
            processDefinition.nameMap = _buildNameMap(processDefinition.flowObjects);
            processDefinition.processElementIndex = _buildIndex(processDefinition);
            processDefinition.sequenceFlowBySourceIndex = _buildFlowIndex(processDefinition.sequenceFlows, true);
            processDefinition.sequenceFlowBySourceTarget = _buildFlowIndex(processDefinition.sequenceFlows, false);
            processDefinition.messageFlowBySourceTarget = _buildFlowIndex(processDefinition.messageFlows, false);
            processDefinition.messageFlowBySourceIndex = _buildFlowIndex(processDefinition.messageFlows, true);
            processDefinition.catchEventIndex = typeof _buildCatchEventIndex(processDefinition.flowObjects) === 'undefined' ? null : _buildCatchEventIndex(processDefinition.flowObjects);
            processDefinition.boundaryEventsByAttachmentIndex = buildBoundaryEventsByAttachmentIndex(processDefinition);
            if (externalMessageFlowBySrcProcess[processDefinition.bpmnId]) {
              if (processDefinition.messageFlowBySourceTarget) {
                externalMessageResolution(processDefinition.messageFlowBySourceIndex, externalMessageFlowBySrcProcess[processDefinition.bpmnId]);
              } else {
                processDefinition.messageFlowBySourceIndex = {};
                externalMessageResolution(processDefinition.messageFlowBySourceIndex, externalMessageFlowBySrcProcess[processDefinition.bpmnId]);
              }
            }
            processDef.processDefinition = processDefinition;
            return next();
          }
        };
        createSubProcess();
      } catch (e) {
        log.error(ctx.options, e.message);
        return next(e);
      }
    } else {
      return next(new Error('Data not present'));
    }
  });

  /**
   * External Message Passing Resolution
   * @param  {[Object]} messageFlows            MessageFlow
   * @param  {[Object]} externalMessageFlows    MessageFlow
   */
  function externalMessageResolution(messageFlows, externalMessageFlows) {
    for (var i in externalMessageFlows) {
      if (Object.prototype.hasOwnProperty.call(externalMessageFlows, i)) {
        externalMessageFlows[i].isExternal = true;
        if (messageFlows[externalMessageFlows[i].sourceRef]) {
          messageFlows[externalMessageFlows[i].sourceRef].push(externalMessageFlows[i]);
        } else {
          messageFlows[externalMessageFlows[i].sourceRef] = [externalMessageFlows[i]];
        }
      }
    }
  }

  /**
   * Fectch FlowObject by Name
   * @param  {String} name    FlowObject Name
   * @return {Object}         FlowObject
   */
  ProcessDefinition.prototype.getFlowObjectByName = function getFlowObjectByName(name) {
    var bpmnId = this.processDefinition.nameMap[name];
    return this.getProcessElement(bpmnId);
  };

  /**
   * Fetch Process Element
   * @param  {String} bpmnId      bpmnId
   * @return {Object}             ProcessElement
   */
  ProcessDefinition.prototype.getProcessElement = function getProcessElement(bpmnId) {
    if (typeof this.processDefinition.processElementIndex === 'undefined') {
      log.error(log.defaultContext(), 'Index should have already been built');
      return null;
    }
    return this.processDefinition.processElementIndex[bpmnId];
  };

  /**
   * Get start events
   * @return {Object}     Event
   */
  ProcessDefinition.prototype.getStartEvents = function getStartEvents() {
    var startEvents = this.processDefinition.flowObjects.filter(flowObject => flowObject && flowObject.isStartEvent);
    if (startEvents.length === 0) {
      log.error(log.defaultContext(), 'No start events found');
      return null;
    } else if (startEvents.length !== 1) {
      /* If more than one start events are found, all should be message-start-event */
      let messageStartEvents = startEvents.filter(item => item.isMessageEvent);
      if (messageStartEvents.length !== startEvents.length) {
        log.error(log.defaultContext(), 'process should have one start event startEvent, to be checked in validation');
        return null;
      }
    }
    return startEvents;
  };

  /**
   * Fetch flows
   * @param  {String} indexName   IndexName
   * @param  {Object} flowObject  FlowObject
   * @return {[Object]}             Flows
   */
  ProcessDefinition.prototype._getFlows = function _getFlows(indexName, flowObject) {
    if (typeof this.processDefinition[indexName] === 'undefined') {
      log.error(log.defaultContext(), 'Index should have already been built');
    }
    return (this.processDefinition[indexName][flowObject.bpmnId] || []);
  };

  /**
   * Get Boundary Events at the corresponding Activity
   * @param  {Object} activity    Activity
   * @return {Object}             Event
   */
  ProcessDefinition.prototype.getBoundaryEventsAt = function getBoundaryEventsAt(activity) {
    if (!this.processDefinition.boundaryEventsByAttachmentIndex) {
      this.processDefinition.boundaryEventsByAttachmentIndex = this.buildBoundaryEventsByAttachmentIndex();
    }
    return (this.processDefinition.boundaryEventsByAttachmentIndex[activity.bpmnId] || []);
  };

  function buildBoundaryEventsByAttachmentIndex(processDef) {
    var index = {};
    var self = processDef;
    var boundaryEvents = processDef.flowObjects.filter((flowObject) => flowObject.isBoundaryEvent);
    boundaryEvents.forEach(function iterateBoundaryEvents(boundaryEvent) {
      var attachedToRef = boundaryEvent.attachedToRef;
      var activity = self.processElementIndex[attachedToRef];
      // var activity = self.getProcessElement(attachedToRef);
      if (activity) {
        if (activity.isWaitTask || activity.isCallActivity || activity.isSubProcess || activity.isInsideTransaction) {
          var entry = index[attachedToRef];
          if (entry) {
            entry.push(boundaryEvent);
          } else {
            index[attachedToRef] = [boundaryEvent];
          }
        } else {
          log.error(log.defaultContext(), "The activity '" + activity.name + "' has a boundary event but this is allowed only for wait tasks such as user or receive tasks.");
        }
      } else {
        log.error(log.defaultContext(), "Cannot find the activity the boundary event '" + boundaryEvent.name +
          "' is attached to activity BPMN ID: '" + boundaryEvent.attachedToRef + "'.");
      }
    });

    return index;
  }
  /**
   * Build boundary Events by attachment Index
   * @return {object}     IndexMap
   */
  ProcessDefinition.prototype.buildBoundaryEventsByAttachmentIndex = function buildBoundaryEventsByAttachmentIndexFn() {
    var self = this;
    return buildBoundaryEventsByAttachmentIndex(self);
  };

  /**
   * Fetch all boundary events
   * @return {[Object]}   FlowObject
   */
  ProcessDefinition.prototype.getBoundaryEvents = function getBoundaryEvents() {
    return this.processDefinition.flowObjects.filter(function filterFlowObjects(flowObject) {
      return (flowObject.isBoundaryEvent);
    });
  };

  /**
   * Find Pool information for the Flow Object
   * @param  {Object} flowObject  FlowObject
   * @return {String}             LaneName
   */
  ProcessDefinition.prototype.findPoolInfo = function findPoolInfo(flowObject) {
    var lanes = this.processDefinition.lanes;
    for (var i in lanes) {
      if (Object.prototype.hasOwnProperty.call(lanes, i)) {
        var lane = lanes[i];
        for (var j in lane.flowNodeRefs) {
          if (Object.prototype.hasOwnProperty.call(lane.flowNodeRefs, j)) {
            var flowObjectId = lane.flowNodeRefs[j];
            if (flowObject.bpmnId === flowObjectId) {
              return lane.name;
            }
          }
        }
      }
    }
    return null;
  };

  /**
   * Generic Flow Index generator function
   * @param  {[Object]} flows         SequenceFlows
   * @param  {String} indexBySource   SourceIndex
   * @return {Object}                 IndexMap
   */
  function _buildFlowIndex(flows, indexBySource) {
    var index = {};
    flows.forEach(function iterateFlows(flow) {
      var ref = indexBySource ? flow.sourceRef : flow.targetRef;
      var entry = index[ref];

      if (entry) {
        entry.push(flow);
      } else {
        index[ref] = [flow];
      }
    });
    return index;
  }

  /**
   * Index builder function
   * @param  {Object} processDefinition   Process-Definition
   * @return {Object}                     IndexMap
   */
  function _buildIndex(processDefinition) {
    var index = {};
    var processElements = processDefinition.flowObjects;
    processElements.concat(processDefinition.sequenceFlows);
    processElements.forEach(function iterateProcessElements(processElement) {
      index[processElement.bpmnId] = processElement;
    });
    return index;
  }

  /**
   * Name Map builder function
   * @param  {[Object]} objects FlowObjects
   * @return {Object}           IndexMap
   */
  function _buildNameMap(objects) {
    /* whlie checking for duplicate names, ignore link events */
    let nonLinkflowObjects = objects.filter(fo => !fo.isLinkEvent);
    var map = {};
    nonLinkflowObjects.forEach(function iterateObjects(object) {
      var name = object.name;
      if (map[name]) {
        log.error(log.defaultContext(), "Process element name '" + name + "' must be unique.");
      } else {
        map[name] = object.bpmnId;
      }
    });
    return map;
  }

  /**
   * Catch Event Index builder function
   * @param  {[Object]} flowObjects FlowObjects
   * @return {Object}               IndexMap
   */
  function _buildCatchEventIndex(flowObjects) {
    var index = {};
    flowObjects.forEach(function iterateFlowObjects(flowObject) {
      if (flowObject.isIntermediateCatchEvent || flowObject.isBoundaryEvent || flowObject.isStartEvent) {
        if (flowObject.isMessageEvent) {
          if (!index[flowObject.messageName]) {
            index[flowObject.messageName] = [];
          }
          index[flowObject.messageName].push(flowObject);
        } else if (flowObject.isSignalEvent) {
          // signal events will be dynamically evaluated
          // if (!index[flowObject.signalName]) {
          //   index[flowObject.signalName] = [];
          // }
          // index[flowObject.signalName].push(flowObject);
        } else if (flowObject.isEscalationEvent) {
          if (!index[flowObject.escalationId]) {
            index[flowObject.escalationId] = [];
          }
          index[flowObject.escalationId].push(flowObject);
        } else if (flowObject.isErrorEvent) {
          if (!index[flowObject.errorId]) {
            index[flowObject.errorId] = [];
          }
          index[flowObject.errorId].push(flowObject);
        } else if (flowObject.isTimerEvent) {
          // as intermediate timer event is thrown by itself only
          index[flowObject.name] = [flowObject];
        } else if (flowObject.isCompensationEvent) {
          if (!index.__compensation) {
            index.__compensation = [flowObject];
          } else {
            index.__compensation.push(flowObject);
          }
        } else if (flowObject.isConditionalEvent) {
          // as intermediate conditional event is thrown by itself only
          index[flowObject.name] = [flowObject];
        }
      }
    });
    return index;
  }
};
