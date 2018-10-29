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
  this.isUserTask = true;
  var currentProcessElement = this;
  if (defObject.attributes_['camunda:taskCategory']) {
    if (defObject.attributes_['camunda:taskCategory'].value === 'multiMaker') {
      currentProcessElement.isMultiMaker = true;
    }
    if (defObject.attributes_['camunda:taskCategory'].value === 'checker') {
      currentProcessElement.isChecker = true;
    }
    if (defObject.attributes_['camunda:taskCategory'].value === 'checkerAutoFinalize') {
      currentProcessElement.isCheckerAutoFinalize = true;
    }
  }
  if (defObject.attributes_['camunda:candidateUsers']) {
    var candidateUsers = defObject.attributes_['camunda:candidateUsers'].value;
    currentProcessElement.candidateUsers = candidateUsers.split(',');
  }
  if (defObject.attributes_['camunda:candidateRoles']) {
    var candidateRoles = defObject.attributes_['camunda:candidateRoles'].value;
    currentProcessElement.candidateRoles = candidateRoles.split(',');
  }
  if (defObject.attributes_['camunda:candidateGroups']) {
    var candidateGroups = defObject.attributes_['camunda:candidateGroups'].value;
    currentProcessElement.candidateGroups = candidateGroups.split(',');
  }
  if (defObject.attributes_['camunda:excludedUsers']) {
    var excludedUsers = defObject.attributes_['camunda:excludedUsers'].value;
    currentProcessElement.excludedUsers = excludedUsers.split(',');
  }
  if (defObject.attributes_['camunda:excludedRoles']) {
    var excludedRoles = defObject.attributes_['camunda:excludedRoles'].value;
    currentProcessElement.excludedRoles = excludedRoles.split(',');
  }
  if (defObject.attributes_['camunda:excludedGroups']) {
    var excludedGroups = defObject.attributes_['camunda:excludedGroups'].value;
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
  if (defObject.attributes_['camunda:creationHook']) {
    currentProcessElement.creationHook = defObject.attributes_['camunda:creationHook'].value;
  }
  if (defObject.attributes_['camunda:completionHook']) {
    currentProcessElement.completionHook = defObject.attributes_['camunda:completionHook'].value;
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
  this.inputOutputParameters = {};
  var serviceConnectorObject;
  if (defObject['bpmn2:extensionElements'] && defObject['bpmn2:extensionElements']['camunda:connector'] &&
    defObject['bpmn2:extensionElements']['camunda:inputOutput']) {
    this.inputOutputParameters = extractInputOutputParameters(defObject['bpmn2:extensionElements']['camunda:inputOutput']);
  }
  if (defObject['bpmn2:extensionElements'] && defObject['bpmn2:extensionElements']['camunda:oeConnector']) {
    this.connectorType = 'oeConnector';
    serviceConnectorObject = defObject['bpmn2:extensionElements']['camunda:oeConnector'];
    this.props = addOeConnectorAttributes(serviceConnectorObject);
  }
  if (defObject['bpmn2:extensionElements'] && defObject['bpmn2:extensionElements']['camunda:finalizeTransactionConnector']) {
    this.connectorType = 'finalizeTransaction';
    serviceConnectorObject = defObject['bpmn2:extensionElements']['camunda:finalizeTransactionConnector'];
    var extractedProps = addFTTConnectorAttributes(serviceConnectorObject);
    this.variableType = extractedProps.variableType;
    this.variableValue = extractedProps.variableValue;
  }
  if (defObject['bpmn2:extensionElements'] && defObject['bpmn2:extensionElements']['camunda:connector']) {
    serviceConnectorObject = defObject['bpmn2:extensionElements']['camunda:connector'];
    var restconnectorProps = addRestConnectorAttributes(serviceConnectorObject);
    this.connectorType  = restconnectorProps.connectorType;
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
 * @returns {Object} Properties
 */
function addOeConnectorAttributes(ConnectorObject) {
  var props = {};
  if (typeof ConnectorObject !== 'undefined') {
    if (ConnectorObject.hasOwnProperty('camunda:model')) {
      props.model = ConnectorObject['camunda:model'].text;
    }
    if (ConnectorObject.hasOwnProperty('camunda:method')) {
      props.method = ConnectorObject['camunda:method'].text;
    }
    if (ConnectorObject.hasOwnProperty('camunda:args')) {
      props.data = ConnectorObject['camunda:args'].text;
    }
  }
  return props;
}

/**
 * Add FTT-connector attributes to service task
 * @param {Object} ConnectorObject ConnectorObject
 * @returns {Object} Properties
 */
function addFTTConnectorAttributes(ConnectorObject) {
  var props = {};
  if (typeof ConnectorObject !== 'undefined') {
    if (ConnectorObject.hasOwnProperty('camunda:FTType')) {
      props.variableType = ConnectorObject['camunda:FTType'].text;
    }
    if (ConnectorObject.hasOwnProperty('camunda:FTValue')) {
      props.variableValue = ConnectorObject['camunda:FTValue'].text;
    }
  }
  return props;
}


/**
 * Add Rest-connector attributes to service task
 * @param {Object} ConnectorObject ConnectorObject
 * @returns {Object} Properties
 */
function addRestConnectorAttributes(ConnectorObject) {
  var props = {};
  var formData = {};

  // TODO: Need to add query string
  if (typeof ConnectorObject !== 'undefined') {
    if (ConnectorObject.hasOwnProperty('camunda:ctype')) {
      props.connectorType = ConnectorObject['camunda:ctype'].text;
    }
    if (ConnectorObject.hasOwnProperty('camunda:url')) {
      formData.url = ConnectorObject['camunda:url'].text;
    }
    if (ConnectorObject.hasOwnProperty('camunda:method')) {
      formData.method = ConnectorObject['camunda:method'].text;
    }
    if (ConnectorObject.hasOwnProperty('camunda:data')) {
      formData.json = ConnectorObject['camunda:data'].text;
    }
    if (ConnectorObject.hasOwnProperty('camunda:headers')) {
      formData.headers = ConnectorObject['camunda:headers'].text;
    }
    if (ConnectorObject.hasOwnProperty('camunda:retries')) {
      formData.retries = ConnectorObject['camunda:retries'].text;
    }
    if (ConnectorObject.hasOwnProperty('camunda:timeout')) {
      formData.timeout = ConnectorObject['camunda:timeout'].text;
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
