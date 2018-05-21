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
  var multiInstanceObject;
  if (typeof defObject !== 'undefined') {
    if (defObject.hasOwnProperty('bpmn:multiInstanceLoopCharacteristics')) {
      taskObject.isMultiInstanceLoop = true;
      multiInstanceObject = defObject['bpmn:multiInstanceLoopCharacteristics'];
      if (typeof multiInstanceObject !== 'undefined' && multiInstanceObject.hasOwnProperty('attributes_')) {
        if (multiInstanceObject.attributes_.hasOwnProperty('isSequential')) {
          taskObject.isSequential = (multiInstanceObject.attributes_.isSequential.value === 'true');
        }
      }
      if (typeof multiInstanceObject !== 'undefined' && multiInstanceObject.hasOwnProperty('bpmn:loopCardinality')) {
        try {
          taskObject.hasLoopCardinality = true;
          taskObject.loopcounter = multiInstanceObject['bpmn:loopCardinality'].text;
        } catch (Numerr) {
          log.debug(log.defaultContext(), Numerr);
        }
      }
    }
    if (defObject.hasOwnProperty('bpmn2:multiInstanceLoopCharacteristics')) {
      taskObject.isMultiInstanceLoop = true;
      multiInstanceObject = defObject['bpmn2:multiInstanceLoopCharacteristics'];
      if (typeof multiInstanceObject !== 'undefined' && multiInstanceObject.hasOwnProperty('attributes_')) {
        if (multiInstanceObject.attributes_.hasOwnProperty('isSequential')) {
          taskObject.isSequential = (multiInstanceObject.attributes_.isSequential.value === 'true');
        }
        if (multiInstanceObject.attributes_.hasOwnProperty('bpmn:loopCardinality')) {
          try {
            taskObject.hasLoopCardinality = true;
            taskObject.loopcounter = multiInstanceObject.attributes_['bpmn:loopCardinality'].text;
          } catch (Numerr) {
            log.debug(log.defaultContext(), Numerr);
            return;
          }
        } else if (multiInstanceObject.attributes_.hasOwnProperty('camunda:collection')) {
          try {
            taskObject.hasCollection = true;
            taskObject.collection = multiInstanceObject.attributes_['camunda:collection'].value;
            if (!multiInstanceObject.attributes_.hasOwnProperty('camunda:elementVariable')) {
              throw new Error('While using collection in Multi Instance Markers, element variable has to be specified');
            }
            taskObject.elementVariable = multiInstanceObject.attributes_['camunda:elementVariable'].value;
          } catch (err) {
            log.debug(log.defaultContext(), err);
            return;
          }
        } else {
          log.debug(log.defaultContext(), new Error('Either specify Loop Cardinality or Collection to use Multi Instance Markers.'));
          return;
        }
      }
      if (typeof multiInstanceObject !== 'undefined' && multiInstanceObject.hasOwnProperty('bpmn2:completionCondition')) {
        try {
          taskObject.hasCompletionCondition = true;
          taskObject.completionCondition = multiInstanceObject['bpmn2:completionCondition'].text;
        } catch (err) {
          log.debug(log.defaultContext(), err);
          return;
        }
      }
      if (typeof multiInstanceObject !== 'undefined' && multiInstanceObject.hasOwnProperty('bpmn2:loopCardinality')) {
        try {
          taskObject.hasLoopCardinality = true;
          taskObject.loopcounter = multiInstanceObject['bpmn2:loopCardinality'].text;
        } catch (Numerr) {
          log.debug(log.defaultContext(), Numerr);
          return;
        }
      }
    }
  }
};
