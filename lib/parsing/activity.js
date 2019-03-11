/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

'use strict';
var logger = require('oe-logger');
var log = logger('Activity-Parser');

var util = require('util');
var BPMNFlowObject = require('./flowobject.js').BPMNFlowObject;

exports.activityEndHandlerPostfix = 'Done';

/**
 * Subsumes all kind of tasks
 * @param {String} bpmnId BpmnId
 * @param {String} name Name
 * @param {String} type Type
 * @constructor
 */
var BPMNActivity = function BPMNActivity(bpmnId, name, type) {
  BPMNFlowObject.call(this, bpmnId, name, type);
  this.isActivity = true;
  log.debug(log.defaultContext(), 'BPMNActivity constructor called');
};
util.inherits(BPMNActivity, BPMNFlowObject);

exports.BPMNActivity = BPMNActivity;
