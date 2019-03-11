/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

'use strict';
var logger = require('oe-logger');
var log = logger('TaskMarkers-Parser');

/**
 * Check if the name is of multi instance loop
 * @param {String} localName name without namespace prefix
 * @return {Boolean} ismultiInstanceLoop
 */
exports.ismultiInstanceLoop = function ismultiInstanceLoop(localName) {
  return (localName.toLowerCase().indexOf('multi') > -1);
};

/**
 * Check if the name is of  loop cardinality
 * @param {String} localName name without namespace prefix
 * @return {Boolean} isLoopCardinality
 */
exports.isLoopCardinality = function isLoopCardinality(localName) {
  return (localName.toLowerCase().indexOf('loopcardinality') > -1);
};

/**
 * Check if the name is of  loop cardinality
 * @param {String} localName name without namespace prefix
 * @return {Boolean} isCollection
 */
exports.isCollection = function isCollection(localName) {
  return (localName.toLowerCase().indexOf('collection') > -1);
};


/**
 * Add Multi Instance Characteristics to the task object
 * @param {BPMNProcessDefinition} defObject ProcessDefinition
 * @param {Object} taskObject TaskObject
 */
exports.checkAndAddMultiInstanceCharacteristics = function checkAndAddMultiInstanceCharacteristics(defObject, taskObject) {
  if (typeof defObject !== 'undefined') {
    let multiInstanceObject;
    let namespace = 'bpmn';
    if (defObject.hasOwnProperty('bpmn2:multiInstanceLoopCharacteristics')) {
      namespace = 'bpmn2';
    }
    multiInstanceObject = defObject[namespace + ':multiInstanceLoopCharacteristics'];
    if (typeof multiInstanceObject !== 'undefined') {
      taskObject.isMultiInstanceLoop = true;

      if (multiInstanceObject.hasOwnProperty('attributes_') && multiInstanceObject.attributes_.hasOwnProperty('isSequential')) {
        taskObject.isSequential = (multiInstanceObject.attributes_.isSequential.value === 'true');
      }

      if (multiInstanceObject.hasOwnProperty(namespace + ':loopCardinality')) {
        // try {
        taskObject.hasLoopCardinality = true;
        taskObject.loopcounter = multiInstanceObject[namespace + ':loopCardinality'].text;
        // } catch (Numerr) {
        //  log.debug(log.defaultContext(), Numerr);
        //  return;
        // }
      } else if (multiInstanceObject.hasOwnProperty('attributes_') && multiInstanceObject.attributes_.hasOwnProperty('camunda:collection')) {
        // try {
        taskObject.hasCollection = true;
        taskObject.collection = multiInstanceObject.attributes_['camunda:collection'].value;
        if (multiInstanceObject.attributes_.hasOwnProperty('camunda:elementVariable')) {
          taskObject.elementVariable = multiInstanceObject.attributes_['camunda:elementVariable'].value;
        } else {
          taskObject.elementVariable = 'loopVariable';
        }
        // } catch (err) {
        //  log.debug(log.defaultContext(), err);
        //  return;
        // }
      } else {
        log.debug(log.defaultContext(), new Error('Either specify Loop Cardinality or Collection or Completion-Condition to use Multi Instance Markers.'));
        return;
      }

      if (multiInstanceObject.hasOwnProperty(namespace + ':completionCondition')) {
        // try {
        taskObject.hasCompletionCondition = true;
        taskObject.completionCondition = multiInstanceObject[namespace + ':completionCondition'].text;
        // } catch (err) {
        //  log.debug(log.defaultContext(), err);
        //  return;
        // }
      }
    }
  }
};
