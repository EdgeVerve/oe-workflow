

/**
 * Add Extension Elements to the task object
 * @param {BPMNProcessDefinition} defObject ProcessDefinition
 * @returns {Object} inoutmappings

*/
module.exports.extractInOutMappings = function extractInOutMappings(defObject) {
  var inputParametersObj = defObject['camunda:in'];
  var outputParametersObj = defObject['camunda:out'];
  var inputOutputMappings = {'inputMappings': createInputOutputMappings(inputParametersObj),
    'outputMappings': createInputOutputMappings(outputParametersObj) };
  return inputOutputMappings;
}

/**
 * Return the input/output parameters
 * @param {Object} inputOutputParameter inputOutputParameter
 * @returns {boolean} isServiceTask
 */
function createInputOutputMappings(inputOutputParameter) {
  var source;
  var target;
  var inputMappings = {};
  if (typeof inputOutputParameter !== 'undefined' && inputOutputParameter.constructor.name === 'Array') {
    for (var input of inputOutputParameter) {
      source = ''
      if (input.attributes_ && input.attributes_.source) {
        source = input.attributes_.source.value;
      } else if (input.attributes_ && input.attributes_.sourceExpression) {
        source = input.attributes_.sourceExpression.value;
      } else if (input.attributes_ && input.attributes_.variables) {
        source = input.attributes_.variables.value;
      }
      if (source === 'variables'){
        target = 'all'
      } else if (source && source !== '') {
        if (input.attributes_ && input.attributes_.target) {
          target = input.attributes_.target.value;
        } else {
          target = '';
        }
      } else {
        target = '';
      }
      inputMappings[source] = target;
    }
  } else if (typeof inputOutputParameter !== 'undefined' && inputOutputParameter.constructor.name === 'Object') {
      var input = inputOutputParameter;
      source = ''
      if (input.attributes_ && input.attributes_.source) {
        source = input.attributes_.source.value;
      } else if (input.attributes_ && input.attributes_.sourceExpression) {
        source = input.attributes_.sourceExpression.value;
      } else if (input.attributes_ && input.attributes_.variables) {
        source = input.attributes_.variables.value;
      }
      if (source === 'variables'){
        target = 'all'
      } else if (source && source !== '') {
        if (input.attributes_ && input.attributes_.target) {
          target = input.attributes_.target.value;
        } else {
          target = '';
        }
      } else {
        target = '';
      }
      inputMappings[source] = target;
  }

  return inputMappings;
}


