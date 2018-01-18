
/**
 * Add Extension Elements to the task object
 * @param {BPMNProcessDefinition} defObject ProcessDefinition
 * @returns {Object} inputOutputParameters

*/
module.exports.extractInputOutputParameters = function extractInputOutputParameters(defObject) {
  var inputParametersObj = defObject['camunda:inputParameter'];
  var outputParametersObj = defObject['camunda:outputParameter'];
  var inputOutputParameters = {'inputParameters': createInputOuputParameters(inputParametersObj),
    'outputParameters': createInputOuputParameters(outputParametersObj) };
  return inputOutputParameters;
};

/**
 * Return the input/output parameters
 * @param {Object} inputOutputParameter inputOutputParameter
 * @returns {boolean} isServiceTask
 */
function createInputOuputParameters(inputOutputParameter) {
  var inputId;
  var inputVal;
  var objKey;
  var inputParameters = {};
  var input;
  var listVals;
  var mapVals;
  if (typeof inputOutputParameter !== 'undefined' && inputOutputParameter.constructor.name === 'Array') {
    for (input of inputOutputParameter) {
      if (input.attributes_ && input.attributes_.name) {
        inputId = input.attributes_.name.value;
      }
      if (input.hasOwnProperty('camunda:script')) {
        inputVal = input['camunda:script'].text;
      }
      if (input.hasOwnProperty('camunda:list')) {
        listVals = input['camunda:list']['camunda:value'];
        if (listVals.constructor && listVals.constructor.name !== Array) {
          listVals = [listVals];
        }
        inputVal = [];
        for (var val of listVals) {
          inputVal.push(val.text);
        }
      }
      if (input.hasOwnProperty('camunda:map')) {
        mapVals = input['camunda:map']['camunda:entry'];
        inputVal = {};
        objKey = '';
        for (var obj of mapVals) {
          if (obj.attributes_ && obj.attributes_.key) {
            objKey = obj.attributes_.key.value;
          }
          inputVal[objKey] = obj.text;
        }
      }
      if (input.hasOwnProperty('text')) {
        inputVal = input.text;
      }
      inputParameters[inputId] = inputVal;
    }
  } else if (typeof inputOutputParameter !== 'undefined' && inputOutputParameter.constructor.name === 'Object') {
    input = inputOutputParameter;
    if (input.attributes_ && input.attributes_.name) {
      inputId = input.attributes_.name.value;
    }
    if (input.hasOwnProperty('camunda:script')) {
      inputVal = input['camunda:script'].text;
    }
    if (input.hasOwnProperty('camunda:list')) {
      listVals = input['camunda:list']['camunda:value'];
      if (listVals.constructor && listVals.constructor.name !== Array) {
        listVals = [listVals];
      }
      inputVal = [];
      for (let val of listVals) {
        inputVal.push(val.text);
      }
    }
    if (input.hasOwnProperty('camunda:map')) {
      mapVals = input['camunda:map']['camunda:entry'];
      inputVal = {};
      objKey = '';
      for (let obj of mapVals) {
        if (obj.attributes_ && obj.attributes_.key) {
          objKey = obj.attributes_.key.value;
        }
        inputVal[objKey] = obj.text;
      }
    }
    if (input.hasOwnProperty('text')) {
      inputVal = input.text;
    }
    inputParameters[inputId] = inputVal;
  }
  return inputParameters;
}

