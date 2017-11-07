/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

'use strict';
var logger = require('oe-logger');
var log = logger('Association-Parser');

/**
 * Create ean association element
 * @param {Object} flowObject flowObject
 * @returns {{sourceRef: String, targetRef: String}} Refernces
 */
exports.createBPMNAssociationElement = function createBPMNAssociationElement(flowObject) {
  log.debug(log.defaultContext(), 'BPMNAssociation called');
  var sourceRef = flowObject.attributes_.sourceRef.value;
  var targetRef = flowObject.attributes_.targetRef.value;
  return new BPMNAssociation(sourceRef, targetRef);
};

/**
 * create a bpmn Association flow
 * @param {String} sourceRef SourceRef
 * @param {String} targetRef TargetRef
 * @constructor
 */
function BPMNAssociation(sourceRef, targetRef) {
  this.sourceRef = sourceRef;
  this.targetRef = targetRef;
}
