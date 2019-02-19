# OE Workflow Engine
[![build status](http://evgit/oecloud.io/oe-workflow/badges/master/build.svg)](http://evgit/oecloud.io/oe-workflow/commits/master)
[![coverage report](http://evgit/oecloud.io/oe-workflow/badges/master/coverage.svg)](http://evgit/oecloud.io/oe-workflow/commits/master)

_oe-workflow_ is a **BPMN 2.0** compliant workflow engine built on [oe-cloud](https://github.com/edgeverve/oe-cloud).
_oe-workflow_ is a production grade workflow engine written in _Node.js_. The number of implemented bpmn-elements are comparable to popular industry standard workflow engines like _jBPM, camunda, activiti_. The exhaustive list
can be found in the wiki. Minimal coding is required from _workflow design creation_ to _deployment_. We provide various built-in connectors like _REST_, _oe-connector_ etc.

## What is BPMN 2.0 ?
_Business Process Model and Notation_ (BPMN) is a graphical representation for specifying business processes in a business process model. It is the standard in business process modeling used widely by enterprises.

## Workflow Models and Elements
_oe-workflow_ can be interacted and managed through either function level API's or Rest Endpoints exposed by the following models.

|ModelName|Description|
|---------|-----------|
|WorkflowDefinition| This model maintains details about all the workflows that have been published. Each Workflow definition can have multiple Process Definitions|
|WorkflowInstance | This model maintains details of instances of the workflows that are executed. Each WorkflowInstance can have multiple Process Instances|
|ProcessDefinition|This model maintains details about all the process definitions deployed and generated through WorkflowDefinition.|
|ProcessInstance|This model maintain details of a created Process Instances by WorkflowInstance. This model maintains process states, process variables, messages, etc. |
|Task|This model is used to manage user tasks for a process instance executing a Workflow.|
|Workflow Manager|This model maintains details pertaining to which workflows are attached to which models. |

## Prerequisites
* Nodejs (LTS)
* MongoDB

## Getting Started
* Clone the git repository for refapp ```git clone https://github.com/EdgeVerve/oe-workflow.git```
* Install Node modules ``` npm install ```
* Start the Application ```node . ```

## Coding Guidelines
Please refer to [Coding Guidlines](./Coding_Guidelines.md) document.
> Run `grunt eslint-test-coverage` to verify code quality.

## Development Pre-requisites
* [loopback](https://loopback.io/)
* [oe-cloud](http://oecloud.io/)
* [BPMN 2.0 spec](http://www.omg.org/spec/BPMN/2.0/)

## More information
Please refer wiki documentation for more information on installation and usage.

## License
The project is licensed under MIT License, See [LICENSE](./LICENSE) for more details.

## Contributing
We welcome contributions. Some of the best ways to contribute are to try things out, file bugs, and join in design conversations.

### [How to contribute](./CONTRIBUTION.md)