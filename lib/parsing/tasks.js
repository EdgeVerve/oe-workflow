/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

'use strict';

var util = require('util');
var BPMNActivity = require('./activity.js').BPMNActivity;
var logger = require('oe-logger');
var log = logger('Tasks-Parser');
var checkAndAddMultiInstanceCharacteristics = require('./taskmarkers.js').checkAndAddMultiInstanceCharacteristics;
var extractInputOutputParameters = require('./parse-utils/input-output-parameters.js').extractInputOutputParameters;
/**
 * Subsumes all kind of tasks
 * @param {String} bpmnId BpmnID
 * @param {String} name Name
 * @param {String} type Type
 * @constructor
 */
var BPMNTask = exports.BPMNTask = function BPMNTask(bpmnId, name, type) {
  log.debug(log.defaultContext(), 'BPMN Task is called');
  BPMNActivity.call(this, bpmnId, name, type);
  this.isWaitTask = type === 'task' || type === 'userTask' || type === 'receiveTask';
  this.isMultiInstanceLoop = false;
  this.isSequential = false;
  this.isReceiveTask = type === 'receiveTask';
  this.inputDataObjectRefs = [];
  this.outputDataObjectRefs = [];
};
util.inherits(BPMNTask, BPMNActivity);

/**
 * create a bpmn task
 * @param {String} bpmnId BpmnID
 * @param {String} name Name
 * @param {String} type Type
 * @param {Object} defObject DefinitionObject
 * @constructor
 */
exports.createBPMNTask = function createBPMNTask(bpmnId, name, type, defObject) {
  var task = new BPMNTask(bpmnId, name, type);
  checkAndAddMultiInstanceCharacteristics(defObject, task);
  if (isUserTask(type)) {
    task.addUserTaskAttributes(defObject);
  } else if (isServiceTask(type)) {
    task.serviceTask = true;
    task.addServiceTaskAttributes(defObject);
  } else if (isScriptTask(type)) {
    task.addScriptTaskAttributes(defObject);
  } else if (isBusinessRuleTask(type)) {
    task.businessRuleTask = true;
    task.addBusinessRuleTaskAttributes(defObject);
  } else if (isReceiveTask(type)) {
    task.receiveTask = true;
    task.addReceiveTaskAttributes(defObject);
  }
  return task;
};

/**
 * Add Attributes to Receive Task
 * @param {BPMNProcessDefinition} defObject ProcessDefinition
 */
BPMNTask.prototype.addReceiveTaskAttributes = function addReceiveTaskAttributes(defObject) {
};


/**
 * Add Attributes to User Task
 * @param {BPMNProcessDefinition} defObject ProcessDefinition
 */
BPMNTask.prototype.addUserTaskAttributes = function addUserTaskAttributes(defObject) {
  // Candidate Users
  // Candidate Roles
  // Candidate Groups
  /* To support old (version 'v1') and new (version 'v2') modelers,
     we are parsing the userTask attributes dynamically using 'propertyType' variable
  */
  let oeCloudType = Object.keys(defObject.attributes_).filter(key => key.indexOf('oecloud:') === 0);
  /* if atleast one oeCloud attribute found,
     then we are assumimg it as 'v2' and assigning 'oecloud:' to propertyType variable
  */
  var propertyType = oeCloudType.length ? 'oecloud:' : 'camunda:';
  this.isUserTask = true;
  var currentProcessElement = this;
  /* taskCategory, ExcludedGroups, ExcludedRoles, ExcludedUsers, CandiadteRoles, creationHook,
    completionHook are the only attributes where we need to do the parsing dynamically and
    by default remaining properties will look for 'camunda:xxxx' for parsing
  */
  if (defObject.attributes_[propertyType + 'taskCategory']) {
    if (defObject.attributes_[propertyType + 'taskCategory'].value === 'multiMaker') {
      currentProcessElement.isMultiMaker = true;
    }
    if (defObject.attributes_[propertyType + 'taskCategory'].value === 'checker') {
      currentProcessElement.isChecker = true;
    }
    if (defObject.attributes_[propertyType + 'taskCategory'].value === 'checkerAutoFinalize') {
      currentProcessElement.isCheckerAutoFinalize = true;
    }
  }
  if (defObject.attributes_['camunda:candidateUsers']) {
    var candidateUsers = defObject.attributes_['camunda:candidateUsers'].value;
    currentProcessElement.candidateUsers = candidateUsers.split(',');
  }
  if (defObject.attributes_[propertyType + 'candidateRoles']) {
    var candidateRoles = defObject.attributes_[propertyType + 'candidateRoles'].value;
    currentProcessElement.candidateRoles = candidateRoles.split(',');
  }
  if (defObject.attributes_['camunda:candidateGroups']) {
    var candidateGroups = defObject.attributes_['camunda:candidateGroups'].value;
    currentProcessElement.candidateGroups = candidateGroups.split(',');
  }
  if (defObject.attributes_[propertyType + 'excludedUsers']) {
    var excludedUsers = defObject.attributes_[propertyType + 'excludedUsers'].value;
    currentProcessElement.excludedUsers = excludedUsers.split(',');
  }
  if (defObject.attributes_[propertyType + 'excludedRoles']) {
    var excludedRoles = defObject.attributes_[propertyType + 'excludedRoles'].value;
    currentProcessElement.excludedRoles = excludedRoles.split(',');
  }
  if (defObject.attributes_[propertyType + 'excludedGroups']) {
    var excludedGroups = defObject.attributes_[propertyType + 'excludedGroups'].value;
    currentProcessElement.excludedGroups = excludedGroups.split(',');
  }
  if (defObject.attributes_['camunda:dueDate']) {
    currentProcessElement.dueDate = defObject.attributes_['camunda:dueDate'].value;
  }
  if (defObject.attributes_['camunda:followUpDate']) {
    currentProcessElement.followUpDate = defObject.attributes_['camunda:followUpDate'].value;
  }
  if (defObject.attributes_['camunda:priority']) {
    currentProcessElement.priority = defObject.attributes_['camunda:priority'].value;
  }
  if (defObject.attributes_[propertyType + 'creationHook']) {
    currentProcessElement.creationHook = defObject.attributes_[propertyType + 'creationHook'].value;
  }
  if (defObject.attributes_[propertyType + 'completionHook']) {
    currentProcessElement.completionHook = defObject.attributes_[propertyType + 'completionHook'].value;
  }
  if (defObject['bpmn2:extensionElements'] && defObject['bpmn2:extensionElements']['camunda:inputOutput']) {
    currentProcessElement.inputOutputParameters = extractInputOutputParameters(defObject['bpmn2:extensionElements']['camunda:inputOutput']);
  }
  addUserTaskFormVariables(defObject, currentProcessElement);
};

/**
 * Add Attributes to Service Task
 * @param {BPMNProcessDefinition} defObject ProcessDefinition
 */
BPMNTask.prototype.addServiceTaskAttributes = function addServiceTaskAttributes(defObject) {
  /* To support 'v1' and 'v2' versions,
     dynamically parse all the attributes of ServiceTask(Rest, OE, FT) similar to UserTask
  */
  this.inputOutputParameters = {};
  var serviceConnectorObject;
  var propertyType;
  let camundaRest = defObject['bpmn2:extensionElements']['camunda:connector'];
  let oecloudRest = defObject['bpmn2:extensionElements']['oecloud:restConnector'];
  if (defObject['bpmn2:extensionElements'] && (camundaRest || oecloudRest) &&
    defObject['bpmn2:extensionElements']['camunda:inputOutput']) {
    this.inputOutputParameters = extractInputOutputParameters(defObject['bpmn2:extensionElements']['camunda:inputOutput']);
  }
  let camundaOE = defObject['bpmn2:extensionElements']['camunda:oeConnector'];
  let oecloudOE = defObject['bpmn2:extensionElements']['oecloud:oeConnector'];
  if (defObject['bpmn2:extensionElements'] && (camundaOE || oecloudOE)) {
    this.connectorType = 'oeConnector';
    propertyType = camundaOE ? 'camunda:' : 'oecloud:';
    serviceConnectorObject = camundaOE ? camundaOE : oecloudOE;
    this.props = addOeConnectorAttributes(serviceConnectorObject, propertyType);
  }
  let camundaFT = defObject['bpmn2:extensionElements']['camunda:finalizeTransactionConnector'];
  let oecloudFT = defObject['bpmn2:extensionElements']['oecloud:finalizeTransactionConnector'];
  if (defObject['bpmn2:extensionElements'] && (camundaFT || oecloudFT)) {
    this.connectorType = 'finalizeTransaction';
    propertyType = camundaFT ? 'camunda:' : 'oecloud:';
    serviceConnectorObject = camundaFT ? camundaFT : oecloudFT;
    var extractedProps = addFTTConnectorAttributes(serviceConnectorObject, propertyType);
    this.variableType = extractedProps.variableType;
    this.variableValue = extractedProps.variableValue;
  }

  if (defObject['bpmn2:extensionElements'] && (camundaRest || oecloudRest)) {
    propertyType = camundaRest ? 'camunda:' : 'oecloud:';
    serviceConnectorObject = camundaRest ? camundaRest : oecloudRest;
    var restconnectorProps = addRestConnectorAttributes(serviceConnectorObject, propertyType);
    this.connectorType = restconnectorProps.connectorType;
    this.formData = restconnectorProps.formData;
  }
};

/**
 * Add Attributes to Script Task
 * @param {BPMNProcessDefinition} defObject ProcessDefinition
 */
BPMNTask.prototype.addScriptTaskAttributes = function addScriptTaskAttributes(defObject) {
  if (defObject.attributes_.scriptFormat) {
    this.scriptFormat = defObject.attributes_.scriptFormat.value;
  }
  if (defObject['bpmn2:script']) {
    this.script = defObject['bpmn2:script'].text;
  } else if (defObject['bpmn:script']) {
    this.script = defObject['bpmn:script'].text;
  }
  if (defObject['bpmn2:extensionElements'] && defObject['bpmn2:extensionElements']['camunda:inputOutput']) {
    this.inputOutputParameters = extractInputOutputParameters(defObject['bpmn2:extensionElements']['camunda:inputOutput']);
  }
};

/**
 * Add Attributes to Business Rule Task
 * @param {BPMNProcessDefinition} defObject ProcessDefinition
 */
BPMNTask.prototype.addBusinessRuleTaskAttributes = function addBusinessRuleTaskAttributes(defObject) {
  if (defObject.attributes_['camunda:decisionRef']) {
    this.ruleName = defObject.attributes_['camunda:decisionRef'].value;
  }
  if (defObject['bpmn2:extensionElements'] && defObject['bpmn2:extensionElements']['camunda:inputOutput']) {
    this.inputOutputParameters = extractInputOutputParameters(defObject['bpmn2:extensionElements']['camunda:inputOutput']);
  }
};

function addUserTaskFormVariables(defObject, taskObject) {
  if (typeof defObject !== 'undefined') {
    if (defObject.attributes_ && defObject.attributes_['camunda:formKey']) {
      taskObject.hasFormAttached = true;
      taskObject.formKey = defObject.attributes_['camunda:formKey'].value;
      taskObject.formType = 'FormKey';
    }
    if (defObject.attributes_ && defObject.attributes_.formVariables) {
      taskObject.hasFormVariables = true;
      taskObject.formVariables = defObject.attributes_.formVariables.value.split(',');
    }
    if (defObject['bpmn2:extensionElements'] && defObject['bpmn2:extensionElements']['camunda:formData']) {
      var formDataObject = defObject['bpmn2:extensionElements']['camunda:formData'];
      taskObject.formType = 'FormData';
      taskObject.formVariables = {};
      var formFieldObject = formDataObject['camunda:formField'];
      var formFieldExtracted;
      if (typeof formFieldObject !== 'undefined') {
        if (formFieldObject.constructor.name === 'Array') {
          for (var formField of formFieldObject) {
            formFieldExtracted = extractFormField(formField);
            taskObject.formVariables[formFieldExtracted.id] = formFieldExtracted;
          }
        }
        if (formFieldObject.constructor.name === 'Object') {
          formFieldExtracted = extractFormField(formFieldObject);
          taskObject.formVariables[formFieldExtracted.id] = formFieldExtracted;
        }
      }
    }
  }
  return;
}

function extractFormField(formFieldObject) {
  var formField = {
    'id': '',
    'label': '',
    'type': '',
    'defaultValue': '',
    'validations': [],
    'properties': []
  };
  if (formFieldObject.attributes_) {
    if (formFieldObject.attributes_.id) {
      formField.id = formFieldObject.attributes_.id.value;
    }
    if (formFieldObject.attributes_.label) {
      formField.label = formFieldObject.attributes_.label.value;
    }
    if (formFieldObject.attributes_.type) {
      formField.type = formFieldObject.attributes_.type.value;
    }
    if (formFieldObject.attributes_.defaultValue) {
      formField.defaultValue = formFieldObject.attributes_.defaultValue.value;
    }
  }
  var name;
  var config = true;
  if (formFieldObject.hasOwnProperty('camunda:validation') && formFieldObject['camunda:validation'].hasOwnProperty('camunda:constraint')) {
    var constraintObject = formFieldObject['camunda:validation']['camunda:constraint'];
    if (constraintObject && constraintObject.constructor.name === 'Object') {
      if (constraintObject.attributes_) {
        if (constraintObject.attributes_.name) {
          name = constraintObject.attributes_.name.value;
        }
        if (constraintObject.attributes_.config) {
          config = constraintObject.attributes_.config.value;
        }
      }
      formField.validations.push({'name': name, 'config': config});
    }
    if (constraintObject && constraintObject.constructor.name === 'Array') {
      for (var eachConstraintObject of constraintObject) {
        if (eachConstraintObject.attributes_) {
          if (eachConstraintObject.attributes_.name) {
            name = eachConstraintObject.attributes_.name.value;
          }
          if (eachConstraintObject.attributes_.config) {
            config = eachConstraintObject.attributes_.config.value;
          }
        }
        formField.validations.push({'name': name, 'config': config});
      }
    }
  }
  var id;
  var value;
  var eachPropertyObject;
  if (formFieldObject.hasOwnProperty('camunda:properties')) {
    var propertyObject = formFieldObject['camunda:properties'];
    if (propertyObject && propertyObject.constructor.name === 'Object') {
      if (propertyObject.hasOwnProperty('camunda:property')) {
        eachPropertyObject = propertyObject['camunda:property'];
        if (eachPropertyObject.attributes_ && eachPropertyObject.attributes_.id) {
          id = eachPropertyObject.attributes_.id.value;
        }
        if (eachPropertyObject.attributes_ && eachPropertyObject.attributes_.value) {
          value = eachPropertyObject.attributes_.value.value;
        }
      }
      formField.properties.push({'id': id, 'value': value});
    }
    if (propertyObject && propertyObject.constructor.name === 'Array') {
      for (eachPropertyObject of propertyObject) {
        var prop;
        if (eachPropertyObject.hasOwnProperty('camunda:property')) {
          prop = eachPropertyObject['camunda:property'];
        }
        if (prop.attributes_) {
          if (prop.attributes_.id) {
            id = prop.attributes_.id.value;
          }
          if (prop.attributes_.value) {
            value = prop.attributes_.value.value;
          }
        }
        formField.properties.push({'id': id, 'value': value});
      }
    }
  }
  return formField;
}

/**
 * Add oe-connector attributes to service task
 * @param {Object} ConnectorObject ConnectorObject
 * @param {String} propertyType propertyType to be set
 * @returns {Object} Properties
 */
function addOeConnectorAttributes(ConnectorObject, propertyType) {
  var props = {};
  if (typeof ConnectorObject !== 'undefined') {
    if (ConnectorObject.hasOwnProperty(propertyType + 'model')) {
      props.model = ConnectorObject[propertyType + 'model'].text;
    }
    if (ConnectorObject.hasOwnProperty(propertyType + 'method')) {
      props.method = ConnectorObject[propertyType + 'method'].text;
    }
    if (ConnectorObject.hasOwnProperty(propertyType + 'args')) {
      props.data = ConnectorObject[propertyType + 'args'].text;
    }
  }
  return props;
}

/**
 * Add FTT-connector attributes to service task
 * @param {Object} ConnectorObject ConnectorObject
 * @param {String} propertyType propertyType to be set
 * @returns {Object} Properties
 */
function addFTTConnectorAttributes(ConnectorObject, propertyType) {
  var props = {};
  if (typeof ConnectorObject !== 'undefined') {
    if (ConnectorObject.hasOwnProperty(propertyType + 'FTType')) {
      props.variableType = ConnectorObject[propertyType + 'FTType'].text;
    }
    if (ConnectorObject.hasOwnProperty(propertyType + 'FTValue')) {
      props.variableValue = ConnectorObject[propertyType + 'FTValue'].text;
    }
  }
  return props;
}


/**
 * Add Rest-connector attributes to service task
 * @param {Object} ConnectorObject ConnectorObject
 * @param {String} propertyType propertyType to be set
 * @returns {Object} Properties
 */
function addRestConnectorAttributes(ConnectorObject, propertyType) {
  var props = {};
  var formData = {};

  // TODO: Need to add query string
  if (typeof ConnectorObject !== 'undefined') {
    if (ConnectorObject.hasOwnProperty(propertyType + 'ctype')) {
      props.connectorType = ConnectorObject[propertyType + 'ctype'].text;
    }
    if (ConnectorObject.hasOwnProperty(propertyType + 'url')) {
      formData.url = ConnectorObject[propertyType + 'url'].text;
    }
    if (ConnectorObject.hasOwnProperty(propertyType + 'method')) {
      formData.method = ConnectorObject[propertyType + 'method'].text;
    }
    if (ConnectorObject.hasOwnProperty(propertyType + 'data')) {
      formData.json = ConnectorObject[propertyType + 'data'].text;
    }
    if (ConnectorObject.hasOwnProperty(propertyType + 'headers')) {
      formData.headers = ConnectorObject[propertyType + 'headers'].text;
    }
    if (ConnectorObject.hasOwnProperty(propertyType + 'retries')) {
      formData.retries = ConnectorObject[propertyType + 'retries'].text;
    }
    if (ConnectorObject.hasOwnProperty(propertyType + 'timeout')) {
      formData.timeout = ConnectorObject[propertyType + 'timeout'].text;
    }
  }
  props.formData = formData;
  return props;
}

/**
 * Check if the name is of service task
 * @param {String} localName name without namespace prefix
 * @returns {boolean} isServiceTask
 */
function isServiceTask(localName) {
  return localName === 'serviceTask';
}

/**
 * Check if the name is of script task
 * @param {String} localName name without namespace prefix
 * @returns {boolean} isScriptTask
 */
function isScriptTask(localName) {
  return localName === 'scriptTask';
}

/**
 * Check if the name is of user task
 * @param {String} localName name without namespace prefix
 * @returns {boolean} isUserTask
 */
function isUserTask(localName) {
  return localName === 'userTask';
}


/**
 * Check if the name is of business Rule task
 * @param {String} localName name without namespace prefix
 * @returns {boolean} isBusinessRuleTask
 */
function isBusinessRuleTask(localName) {
  return localName === 'businessRuleTask';
}

/**
 * Check if the name is of receive task
 * @param {String} localName name without namespace prefix
 * @returns {boolean} isBusinessRuleTask
 */
function isReceiveTask(localName) {
  return localName === 'receiveTask';
}

/**
 * validate assertions for name and sequence flows
 * @param {BPMNProcessDefinition} processDefinition ProcessDefinition
 * @param {BPMNParseErrorQueue} errorQueue ErrorQueue
 */
BPMNTask.prototype.validate = function validate(processDefinition, errorQueue) {
  this.assertName(errorQueue);
  this.assertIncomingSequenceFlows(processDefinition, errorQueue);
  this.assertOutgoingSequenceFlows(processDefinition, errorQueue);
};
