var oecloud = require('oe-cloud');
var loopback = require('loopback');
var fs = require('fs');
var path = require('path');

oecloud.observe('loaded', function testFunction(ctx, next) {
  // eslint-disable-next-line
  console.log('oe-cloud modules loaded');
  return next();
});

oecloud.boot(__dirname, function testFunction(err) {
  if (err) {
    throw err;
  }
  oecloud.start();
  oecloud.emit('test-start');
});


var chalk = require('chalk');
var chai = require('chai');
var async = require('async');
chai.use(require('chai-things'));
chai.use(require('chai-datetime'));

var expect = chai.expect;

var app = oecloud;
var defaults = require('superagent-defaults');
var supertest = require('supertest');
var api = defaults(supertest(app));
var basePath = app.get('restApiRoot');

var defaultContext = {};

function getContext(usr, roles, group) {
  return {
    ctx: {
      username: usr,
      remoteUser: usr,
      roles: roles,
      group: group
    }
  };
}

function deleteAll(model, callback) {
  model.destroyAll({}, {}, function testFunction(err) {
    return callback(err);
  });
}

function createAll(model, items, callback) {
  async.forEachOf(items,
    function testFunction(item, m, callback2) {
      model.create(item, defaultContext, function testFunction(err, data) {
        callback2(err, data);
      });
    },
    function testFunction(err) {
      return callback(err);
    });
}

function deleteAndCreate(model, items, callback) {
  deleteAll(model, function testFunction(err) {
    if (err) {
      callback(err);
    } else {
      createAll(model, items, callback);
    }
  });
}

function loadBpmnDataAndFile(name, callback) {
  fs.readFile(path.resolve('./test/bpmn-files', name + '.bpmn'), 'utf8', (err, xmldata) => {
    if (err) {
      return callback(err);
    }
    oecloud.models.bpmndata.create({
      versionmessage: '1.0',
      bpmnname: name,
      xmldata: xmldata
    }, function testFunction(err, bpmnData) {
      expect(err).to.not.exist;
      var defData = {
        bpmndataId: bpmnData.id,
        name: name,
        xmldata: xmldata
      };
      oecloud.models.WorkflowDefinition.create(defData, defaultContext, function cb(err, wfDefn) {
        callback(err, wfDefn);
      });
    });
  });
}


function loadBpmnFile(fileName, workflowName, callback) {
  if (!callback && typeof workflowName === 'function') {
    callback = workflowName;
    workflowName = fileName;
  }
  fs.readFile(path.resolve('./test/bpmn-files', fileName + '.bpmn'), 'utf8', (err, xmldata) => {
    if (err) {
      return callback(err);
    }
    var defData = {
      name: workflowName,
      xmldata: xmldata
    };
    oecloud.models.WorkflowDefinition.create(defData, defaultContext, function cb(err, wfDefn) {
      callback(err, wfDefn);
    });
  });
}

function triggerWorkflow(name, data, callback) {
  if (!data.workflowDefinitionName) {
    data.workflowDefinitionName = name;
  }
  app.models.WorkflowInstance.create(data, defaultContext, function cb(err, instance) {
    if (err) {
      // eslint-disable-next-line
      console.error(err);
    }
    callback(err, instance);
  });
}

// function removeListener(eventEmitter, eventName, eventHandler) {
//   var handlers = eventEmitter._events[eventName];
//   if (handlers === eventHandler) {
//     delete eventEmitter._events[eventName];
//   } else if (Array.isArray(handlers)) {
//     let index = handlers.indexOf(eventHandler);
//     if (index > -1) {
//       handlers.splice(index, 1);
//     } else {
//       console.warn('Handler not found for ', eventName);
//     }
//   }
// }

function removeCompleteListener(wfName) {
  app.models.ProcessInstance.removeAllListeners(wfName + '-complete');
}

function removeInterruptedListener(wfName) {
  app.models.ProcessInstance.removeAllListeners(wfName + '-interrupted');
}

function removeTokenStatusListener(wfName) {
  app.models.ProcessInstance.removeAllListeners(wfName + '-running');
}

function removeUserTaskListener(wfName, taskName) {
  app.models.Task.removeAllListeners(wfName + '-' + taskName);
}


function onComplete(workflowName, callback) {
  let eventName = workflowName + '-complete';
  let completionHandler = function testFunction(data) {
    /* Remove ourself from event-listeners */
    app.models.ProcessInstance.removeListener(eventName, completionHandler);
    /* And callback */
    callback(null, data.instance);
  };
  app.models.ProcessInstance.on(eventName, completionHandler);
}

function onInterrupted(workflowName, callback) {
  let eventName = workflowName + '-interrupted';
  let completionHandler = function testFunction(data) {
    /* Remove ourself from event-listeners */
    app.models.ProcessInstance.removeListener(eventName, completionHandler);
    /* And callback */
    callback(null, data.instance);
  };
  app.models.ProcessInstance.on(eventName, completionHandler);
}

function onWorkflowTerminated(workflowName, callback) {
  let eventName = workflowName + '-terminated';
  let completionHandler = function testFunction(instance) {
    /* Remove ourself from event-listeners */
    app.models.WorkflowInstance.removeListener(eventName, completionHandler);
    /* And callback */
    callback(null, instance);
  };
  app.models.WorkflowInstance.on(eventName, completionHandler);
}

function onTokenStatus(workflowName, tokenName, tokenStatus, callback) {
  let eventName = workflowName + '-running';
  let completionHandler = function testFunction(data) {
    let instance = data.instance;
    let matchingToken = Object.values(instance._processTokens).find(v => {
      return v.name === tokenName && (v.status === tokenStatus);
    });
    if (matchingToken) {
      /* Remove ourself from event-listeners */
      app.models.ProcessInstance.removeListener(eventName, completionHandler);
      /* And callback */
      callback(null, instance, matchingToken);
    }
  };
  app.models.ProcessInstance.on(eventName, completionHandler);
}


function triggerAndComplete(name, data, callback) {
  let wfInstance;
  let eventName = name + '-complete';
  let completionHandler = function testFunction(data) {
    /* Remove ourself from event-listeners */
    app.models.ProcessInstance.removeListener(eventName, completionHandler);
    /* And callback */
    callback(null, wfInstance, data.instance);
  };
  app.models.ProcessInstance.on(eventName, completionHandler);
  triggerWorkflow(name, data, function testFunction(err, instance) {
    if (err) {
      // eslint-disable-next-line
      console.warn('ERROR Triggering the workflow', err);
      app.models.ProcessInstance.removeListener(eventName, completionHandler);
      /* Callback immediately, as process-instance would never raise events */
      callback(err, instance);
    }
    wfInstance = instance;
    /* Callback will be called by complete-event-handler */
  });
}

function onUserTask(name, taskName, callback) {
  let eventName = name + '-' + taskName;
  let completionHandler = function testFunction(task, instance) {
    /* Remove ourself from event-listeners */
    app.models.Task.removeListener(eventName, completionHandler);
    /* And callback */
    callback(null, task, instance);
  };
  app.models.Task.on(eventName, completionHandler);
}

function triggerWaitForUserTask(name, data, taskName, callback) {
  let wfInstance;
  let eventName = name + '-' + taskName;
  let completionHandler = function testFunction(task, instance) {
    /* Remove ourself from event-listeners */
    app.models.Task.removeListener(eventName, completionHandler);
    /* And callback */
    callback(null, wfInstance, instance, task);
  };
  app.models.Task.on(eventName, completionHandler);
  triggerWorkflow(name, data, function testFunction(err, instance) {
    if (err) {
      app.models.Task.removeListener(eventName, completionHandler);
      /* Callback immediately, as process-instance would never raise events */
      callback(err, instance);
    }
    wfInstance = instance;
    /* Callback will be called by complete-event-handler */
  });
}


function triggerAndWaitForTokenStatus(name, data, tokenName, tokenStatus, callback) {
  let wfInstance;
  let eventName = name + '-running';
  let completionHandler = function testFunction(data) {
    let instance = data.instance;
    let matchingToken = Object.values(instance._processTokens).find(v => {
      return v.name === tokenName && (v.status === tokenStatus);
    });
    if (matchingToken) {
      /* Remove ourself from event-listeners */
      app.models.ProcessInstance.removeListener(eventName, completionHandler);
      /* And callback */
      callback(null, wfInstance, instance, matchingToken);
    }
  };
  app.models.ProcessInstance.on(eventName, completionHandler);
  triggerWorkflow(name, data, function testFunction(err, instance) {
    if (err) {
      app.models.ProcessInstance.removeListener(eventName, completionHandler);
      /* Callback immediately, as process-instance would never raise events */
      callback(err, instance);
    }
    wfInstance = instance;
    /* Callback will be called by complete-event-handler */
  });
}

function loadAndTrigger(name, data, callback) {
  loadBpmnFile(name, function testFunction(err, wfDefn) {
    if (err) {
      // eslint-disable-next-line
      console.error(err);
      return callback(err);
    }
    triggerWorkflow(name, data, function testFunction(err, wfInst) {
      callback(err, wfDefn, wfInst);
    });
  });
}

function cleanUp(workflowName, done) {
  let models = app.models;

  let defaultProcessEvents = ['TOKEN_ARRIVED_EVENT', 'SUBPROCESS_END_EVENT', 'INTERMEDIATE_CATCH_EVENT', 'SUBPROCESS_INTERRUPT_EVENT', 'PROCESS_TERMINATE', 'TERMINATE_INTERRUPT_EVENT', 'attached', 'remoteMethodDisabled', 'remoteMethodAdded'];
  let processEventsNow = models.ProcessInstance.eventNames();
  if (processEventsNow.length !== defaultProcessEvents.length) {
    processEventsNow.forEach(evt => {
      if (defaultProcessEvents.indexOf(evt) < 0) {
        // eslint-disable-next-line
        console.warn('################ Removing residual ProcessInstance event', evt);
        app.models.ProcessInstance.removeAllListeners(evt);
      }
    });
  }

  let defaultTaskEvents = ['TASK_INTERRUPT_EVENT', 'remoteMethodDisabled', 'remoteMethodAdded'];
  let taskEventsNow = models.ProcessInstance.eventNames();
  if (taskEventsNow.length !== defaultTaskEvents.length) {
    defaultTaskEvents.forEach(evt => {
      if (defaultTaskEvents.indexOf(evt) < 0) {
        // eslint-disable-next-line
        console.warn('############### Removing residual Task event', evt);
        app.models.Task.removeAllListeners(evt);
      }
    });
  }

  async.series([
    function testFunction(callback) {
      models.ChangeWorkflowRequest.destroyAll({}, callback);
    },
    function testFunction(callback) {
      models.WorkflowSignal.destroyAll({}, callback);
    },
    function testFunction(callback) {
      models.WorkflowMapping.destroyAll({}, callback);
    },
    function testFunction(callback) {
      models.ProcessInstance.destroyAll({}, callback);
    },
    function testFunction(callback) {
      models.WorkflowInstance.destroyAll({}, callback);
    },
    function testFunction(callback) {
      models.ProcessDefinition.destroyAll({}, callback);
    },
    function testFunction(callback) {
      models.WorkflowDefinition.destroyAll({}, callback);
    },
    function testFunction(callback) {
      models.Task.destroyAll({}, callback);
    },
    function testFunction(callback) {
      models.Person.destroyAll({}, callback);
    }

  ], function testFunction(err, results) {
    done(err);
  });


  // models.WorkflowSignal.destroyAll({}, function cb0(err0) {
  //   models.ProcessInstance.destroyAll({
  //     //processDefinitionName: workflowName
  //   }, function cb1(err1) {
  //     models.WorkflowInstance.destroyAll({
  //       //workflowDefinitionName: workflowName
  //     }, function cb2(err2) {
  //       models.ProcessDefinition.destroyAll({
  //         //name: workflowName
  //       }, function cb3(err3) {
  //         models.WorkflowDefinition.destroyAll({
  //           //name: workflowName
  //         }, function cb4(err4) {
  //           models.Task.destroyAll({}, function cb5(err5) {
  //             models.Person.destroyAll({}, function cb6(err6) {
  //               done(err0 || err1 || err2 || err3 || err4 || err5 || err6);
  //             });
  //           });
  //         });
  //       });
  //     });
  //   });
  // });
}

function login(user, cb) {
  api.post('/api/Users/login')
    .send(user)
    .expect(200).end(function testFunction(err, res) {
      if (err) {
        return cb(err);
      }
      var accessToken = res.body.id;
      return cb(null, accessToken);
    });
}

describe(chalk.blue('SkeletonTest Started'), function testFunction(done) {
  this.timeout(20000);
  before('wait for boot scripts to complete', function testFunction(done) {
    app.on('test-start', function testFunction() {
      deleteAll(loopback.findModel('User'), function testFunction(err) {
        return done(err);
      });
    });
  });

  afterEach('destroy context', function testFunction(done) {
    done();
  });

  it('t1 create user admin/admin with /default tenant', function testFunction(done) {
    var url = basePath + '/users';
    api.set('Accept', 'application/json')
      .post(url)
      .send([{
        username: 'admin',
        password: 'admin',
        email: 'admin@admin.com'
      },
      {
        username: 'evuser',
        password: 'evuser',
        email: 'evuser@evuser.com'
      },
      {
        username: 'infyuser',
        password: 'infyuser',
        email: 'infyuser@infyuser.com'
      },
      {
        username: 'bpouser',
        password: 'bpouser',
        email: 'infyuser@infyuser.com'
      }
      ])
      .end(function testFunction(err, response) {
        expect(err).to.not.exist;
        var result = response.body;
        expect(result[0].id).to.be.defined;
        expect(result[1].id).to.be.defined;
        expect(result[2].id).to.be.defined;
        expect(result[3].id).to.be.defined;
        done();
      });
  });

  it('disables the monitoring process', function testFunction(done) {
    this.timeout(15000);
    /* Can't base on start event as sometime it is triggered
     * even before we attach a listener. Using crude and humble timeout */
    setTimeout(function timeoutCb() {
      app.models.MasterControl.disable('WORKFLOW-MONITOR', 'Running Tests', function cb(err, response) {
        expect(err).to.not.exist;
        expect(response).to.exist;
        if (response === 'WORKFLOW-MONITOR is already flagged as disabled') {
          done();
        } else {
          app.once('stop-workflow-monitoring', done);
        }
      });
    }, 5000);
  });
});

let Status = {
  COMPLETE: 'complete',
  FAILED: 'failed',
  PENDING: 'pending',
  RUNNING: 'running',
  INTERRUPTED: 'interrupted',
  TERMINATED: 'terminated',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  REWORK: 'rework'
};
module.exports = {
  Status: Status,
  app: oecloud,
  loopback: loopback,
  chai: chai,
  chalk: chalk,
  api: api,
  basePath: basePath,
  defaultContext: defaultContext,
  deleteAndCreate: deleteAndCreate,
  createAl: createAll,
  deleteAll: deleteAll,
  loadBpmnFile: loadBpmnFile,
  loadBpmnDataAndFile: loadBpmnDataAndFile,
  triggerWorkflow: triggerWorkflow,
  loadAndTrigger: loadAndTrigger,
  triggerAndComplete: triggerAndComplete,
  triggerAndWaitForTokenStatus: triggerAndWaitForTokenStatus,
  triggerWaitForUserTask: triggerWaitForUserTask,
  onComplete: onComplete,
  onInterrupted: onInterrupted,
  onWorkflowTerminated: onWorkflowTerminated,
  onTokenStatus: onTokenStatus,
  onUserTask: onUserTask,
  removeCompleteListener: removeCompleteListener,
  removeInterruptedListener: removeInterruptedListener,
  removeTokenStatusListener: removeTokenStatusListener,
  removeUserTaskListener: removeUserTaskListener,
  cleanUp: cleanUp,
  getContext: getContext,
  login: login
};
