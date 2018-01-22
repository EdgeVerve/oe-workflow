/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

'use strict';
var logger = require('oe-logger');
var log = logger('Lanes-Parser');

/**
 * Subsumes all kind of Lanes
 * @param {String} bpmnId BpmnId
 * @param {String} name Name
 * @param {String} type Type
 * @param {String} flowNodeRefs flowNodeRefs
 * @constructor
 */
var BPMNLane = exports.BPMNLane = function BPMNLane(bpmnId, name, type, flowNodeRefs) {
  log.debug(log.defaultContext(), 'BPMN Lane constructor called.');

  this.bpmnId = bpmnId;
  this.name = name;
  this.type = type;
  this.flowNodeRefs = flowNodeRefs;
};

/**
 * creates a BPMN Lane from the flowObject
 * @param {Object} flowObject flowObject
 * @constructor
 */
exports.createBPMNLane = function createBPMNLane(flowObject) {
  var lanes = [];
  var laneObject;
  var bpmnId;
  var name;
  var type;
  var flowNodeRefs = [];
  if (flowObject['bpmn:lane']) {
    laneObject = flowObject['bpmn:lane'];
    if (laneObject) {
      if (laneObject.constructor.name === 'Array') {
        for (var lane of laneObject) {
          bpmnId = '';
          name = '';
          type = '';
          flowNodeRefs = [];
          if (lane.attributes_) {
            if (typeof lane.attributes_.id !== 'undefined') {
              bpmnId = lane.attributes_.id.value;
            }
            if (typeof lane.attributes_.name !== 'undefined') {
              name = lane.attributes_.name.value;
            }
          }
          if (lane.attributes_ns) {
            type = lane.attributes_ns.local;
          }
          if (lane.hasOwnProperty('bpmn:flowNodeRef')) {
            flowNodeRefs = extractFlowNodeRefs(lane['bpmn:flowNodeRef']);
          }
          lanes.push(new BPMNLane(bpmnId, name, type, flowNodeRefs));
        }
      }
      if (laneObject.constructor.name === 'Object') {
        lane = laneObject;
        bpmnId = '';
        name = '';
        type = '';
        flowNodeRefs = [];
        if (lane.attributes_) {
          if (typeof lane.attributes_.id !== 'undefined') {
            bpmnId = lane.attributes_.id.value;
          }
          if (typeof lane.attributes_.name !== 'undefined') {
            name = lane.attributes_.name.value;
          }
        }
        if (lane.attributes_ns) {
          type = lane.attributes_ns.local;
        }
        if (lane.hasOwnProperty('bpmn:flowNodeRef')) {
          flowNodeRefs = extractFlowNodeRefs(lane['bpmn:flowNodeRef']);
        }
        lanes.push(new BPMNLane(bpmnId, name, type, flowNodeRefs));
      }
    }
  }
  return lanes;
};

function extractFlowNodeRefs(defObject) {
  var flowNodeRefs = [];
  if (defObject) {
    if (defObject.constructor.name === 'Array') {
      for (var nodeRefs of defObject) {
        if (nodeRefs.text) {
          flowNodeRefs.push(nodeRefs.text);
        }
      }
    }
    if (defObject.constructor.name === 'Object') {
      if (defObject.text) {
        flowNodeRefs.push(defObject.text);
      }
    }
  }
  return flowNodeRefs;
}

