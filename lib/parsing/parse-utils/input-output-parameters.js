
/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
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
  var value;
  if (typeof inputOutputParameter !== 'undefined' && inputOutputParameter.constructor.name === 'Array') {
    for (input of inputOutputParameter) {
      if (input.attributes_ && input.attributes_.name) {
        inputId = input.attributes_.name.value;
      }
      if (input.hasOwnProperty('camunda:script')) {
        let scriptText = input['camunda:script'].text;
        /* purely for supporting old functionality i.e. expressions which are enclosed inside '${}'
        now ideally expressions no need to be enclosed in '${}' */
        if (scriptText.startsWith('${') && scriptText.endsWith('}')) {
          inputVal = scriptText;
        } else {
          inputVal = '@script__' + scriptText;
        }
      }
      if (input.hasOwnProperty('camunda:list')) {
        listVals = input['camunda:list']['camunda:value'];
        if (listVals.constructor && listVals.constructor.name !== 'Array') {
          listVals = [listVals];
        }
        inputVal = [];
        for (var val of listVals) {
          inputVal.push(val.text);
        }
      }
      if (input.hasOwnProperty('camunda:map')) {
        mapVals = input['camunda:map']['camunda:entry'];
        if (mapVals.constructor && mapVals.constructor.name !== 'Array') {
          mapVals = [mapVals];
        }
        inputVal = {};
        objKey = '';
        for (var obj of mapVals) {
          if (obj.attributes_ && obj.attributes_.key) {
            objKey = obj.attributes_.key.value;
          }
          /* obj.text will be a string, so convert that string to other datatypes based on value */
          value = obj.text;
          if (!isNaN(value)) {
            value = Number(value);
          } else if (value === 'true') {
            value = true;
          } else if (value === 'false') {
            value = false;
          }
          inputVal[objKey] = value;
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
      let scriptText = input['camunda:script'].text;
      /* purely for supporting old functionality i.e. expressions which are enclosed inside '${}'
      now ideally expressions no need to be enclosed in '${}' */
      if (scriptText.startsWith('${') && scriptText.endsWith('}')) {
        inputVal = scriptText;
      } else {
        inputVal = '@script__' + scriptText;
      }
    }
    if (input.hasOwnProperty('camunda:list')) {
      listVals = input['camunda:list']['camunda:value'];
      if (listVals.constructor && listVals.constructor.name !== 'Array') {
        listVals = [listVals];
      }
      inputVal = [];
      for (let val of listVals) {
        inputVal.push(val.text);
      }
    }
    if (input.hasOwnProperty('camunda:map')) {
      mapVals = input['camunda:map']['camunda:entry'];
      if (mapVals.constructor && mapVals.constructor.name !== 'Array') {
        mapVals = [mapVals];
      }
      inputVal = {};
      objKey = '';
      for (let obj of mapVals) {
        if (obj.attributes_ && obj.attributes_.key) {
          objKey = obj.attributes_.key.value;
        }
        /* obj.text will be a string, so convert that string to other datatypes based on value */
        value = obj.text;
        if (!isNaN(value)) {
          value = Number(value);
        } else if (value === 'true') {
          value = true;
        } else if (value === 'false') {
          value = false;
        }
        inputVal[objKey] = value;
      }
    }
    if (input.hasOwnProperty('text')) {
      inputVal = input.text;
    }
    inputParameters[inputId] = inputVal;
  }
  return inputParameters;
}

