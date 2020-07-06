/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

let bootstrap = require('../bootstrap.js');
let chai = bootstrap.chai;
let expect = chai.expect;
let models = bootstrap.app.models;
let stateVerifier = require('../utils/state-verifier');
let oeDateUtils = require('../../lib/utils/oe-date-utils');
var Status = bootstrap.Status;

function getContext(usr, roles, group) {
  return {
    ctx: {
      username: usr,
      roles: roles,
      group: group
    }
  };
}

describe('User Task Tests', function callback() {
  var workflowName = 'user-task';
  before('define workflow', function testFunction(done) {
    bootstrap.loadBpmnFile(workflowName, function testFunction(err) {
      expect(err).to.not.exist;
      done(err);
    });
  });

  after('cleanup data', function testFunction(done) {
    bootstrap.cleanUp(workflowName, done);
  });

  describe('Candidate and Excluded Users', function testFunction() {
    let processInstance;
    let userTask;
    let workflowPayload = {
      processVariables: {
        cUsers: 'user1, user3',
        eUsers: 'user2'
      },
      message: {}
    };
    before(function testFunction(done) {
      bootstrap.triggerWaitForUserTask(workflowName, workflowPayload, 'UserTask', function testFunction(err, wfInst, procInstance, task) {
        processInstance = procInstance;
        userTask = task;
        done(err);
      });
    });
    after(function testFunction() {
      processInstance = null;
      userTask = null;
      bootstrap.removeCompleteListener(workflowName);
      bootstrap.removeUserTaskListener(workflowName, 'UserTask');
    });
    it('waits on user-task', function testFunction(done) {
      expect(processInstance).to.exist;
      expect(processInstance.passiveWait).to.be.true;
      var userTaskToken = stateVerifier.fetchTokenByName(processInstance, 'UserTask');
      expect(userTaskToken).to.exist;
      expect(userTaskToken.status).to.equal(Status.PENDING);
      stateVerifier.isRunning(processInstance);
      stateVerifier.verifyTokens(processInstance, [{
        name: 'Start',
        status: Status.COMPLETE
      }, {
        name: 'UserTask',
        status: Status.PENDING
      }]);
      done();
    });

    it('populates candidate and excludedUsers through placeholder', function testFunction(done) {
      expect(processInstance).to.exist;
      processInstance.tasks({}, bootstrap.defaultContext, function testFunction(err, tasks) {
        expect(err).to.not.exist;
        expect(tasks).to.exist.and.be.an('array').of.length(1);
        var task = tasks[0];
        expect(task.status).to.equal(Status.PENDING);
        expect(task.candidateUsers).to.have.members(['user1', 'user3']);
        expect(task.excludedUsers).to.have.members(['user2']);
        done();
      });
    });

    it('filtered: Fetches tasks for candidateUsers', function testFunction(done) {
      let filter = {
        where: {
          id: userTask.id
        }
      };
      models.Task.filtered(filter, getContext('user1'), function testFunction(err, data) {
        expect(err).to.not.exist;
        expect(data).to.be.an('array').of.length(1);
        done();
      });
    });

    it('filtered: Does not fetch tasks for excludedUsers', function testFunction(done) {
      let filter = {
        where: {
          id: userTask.id
        }
      };
      models.Task.filtered(filter, getContext('user2'), function testFunction(err, data) {
        expect(err).to.not.exist;
        expect(data).to.be.an('array').of.length(0);
        done();
      });
    });

    it('filtered: works when fields filter is applied', function testFunction(done) {
      let filter = {
        fields: {
          id: true,
          name: true,
          status: true
        },
        where: {
          id: userTask.id
        }
      };
      models.Task.filtered(filter, getContext('user2'), function testFunction(err, data) {
        expect(err).to.not.exist;
        expect(data).to.be.an('array').of.length(0);
        /* Reset fields */
        filter.fields = {
          id: true,
          name: true,
          status: true
        };
        models.Task.filtered(filter, getContext('user1'), function testFunction(err, data) {
          expect(err).to.not.exist;
          expect(data).to.be.an('array').of.length(1);
          done();
        });
      });
    });


    it('excludedUsers cannot complete task', function testFunction(done) {
      userTask.complete({}, getContext('user2'), function testFunction(err, data) {
        expect(err).to.exist;
        expect(err.code).to.equal('TASK_NOT_ASSIGNED');
        expect(err.status).to.equal(403);
        done();
      });
    });

    it('unrelated users can not complete the task', function testFunction(done) {
      userTask.complete({}, getContext('user4'), function testFunction(err, data) {
        expect(err).to.exist;
        expect(err.code).to.equal('TASK_NOT_ASSIGNED');
        expect(err.status).to.equal(403);
        done();
      });
    });

    it('candidate users can complete the task and process instance', function testFunction(done) {
      bootstrap.onComplete(workflowName, function testFunction(err, inst) {
        expect(err).to.not.exist;
        stateVerifier.isComplete(inst);
        stateVerifier.verifyTokens(inst, [{
          name: 'Start',
          status: Status.COMPLETE
        }, {
          name: 'UserTask',
          status: Status.COMPLETE
        }, {
          name: 'End',
          status: Status.COMPLETE
        }]);
        done();
      });
      userTask.complete({}, getContext('user3'), function testFunction(err, task) {
        expect(err).to.not.exist;
        expect(task.status).to.equal(Status.COMPLETE);
      });
    });
  });

  describe('Candidate and Excluded Groups', function testFunction() {
    let processInstance;
    let userTask;
    let workflowPayload = {
      processVariables: {
        cGroups: 'backoffice',
        eGroups: 'frontoffice, midoffice'
      },
      message: {}
    };
    before('Trigger workflow', function testFunction(done) {
      bootstrap.triggerWaitForUserTask(workflowName, workflowPayload, 'UserTask', function testFunction(err, wfInst, procInst, task) {
        expect(err).to.not.exist;
        processInstance = procInst;
        userTask = task;
        done(err);
      });
    });
    after('Remove listeners', function testFunction(done) {
      bootstrap.removeCompleteListener(workflowName);
      bootstrap.removeUserTaskListener(workflowName, 'UserTask');
      done();
    });
    it('waits on user-task', function testFunction(done) {
      expect(processInstance).to.exist;
      expect(processInstance.passiveWait).to.be.true;
      var userTaskToken = stateVerifier.fetchTokenByName(processInstance, 'UserTask');
      expect(userTaskToken).to.exist;
      expect(userTaskToken.status).to.equal(Status.PENDING);
      stateVerifier.isRunning(processInstance);
      stateVerifier.verifyTokens(processInstance, [{
        name: 'Start',
        status: Status.COMPLETE
      }, {
        name: 'UserTask',
        status: Status.PENDING
      }]);
      done();
    });

    it('populates candidate and excludedGroups through placeholder', function testFunction(done) {
      expect(processInstance).to.exist;
      processInstance.tasks({}, bootstrap.defaultContext, function testFunction(err, tasks) {
        expect(err).to.not.exist;
        expect(tasks).to.exist.and.be.an('array').of.length(1);
        var task = tasks[0];
        expect(task.status).to.equal(Status.PENDING);
        expect(task.excludedGroups).to.have.members(['frontoffice', 'midoffice']);
        expect(task.candidateGroups).to.have.members(['backoffice']);
        done();
      });
    });

    it('filtered: Fetches tasks for candidateGroups', function testFunction(done) {
      let filter = {
        where: {
          id: userTask.id
        }
      };
      models.Task.filtered(filter, getContext(null, null, 'backoffice'), function testFunction(err, data) {
        expect(err).to.not.exist;
        expect(data).to.be.an('array').of.length(1);
        done();
      });
    });

    it('filtered: Does not fetch tasks for excludedGroups', function testFunction(done) {
      let filter = {
        where: {
          id: userTask.id
        }
      };
      models.Task.filtered(filter, getContext(null, null, 'frontoffice'), function testFunction(err, data) {
        expect(err).to.not.exist;
        expect(data).to.be.an('array').of.length(0);
        done();
      });
    });

    it('filtered: works when fields filter is applied', function testFunction(done) {
      let filter = {
        fields: {
          id: true,
          name: true,
          status: true
        },
        where: {
          id: userTask.id
        }
      };
      models.Task.filtered(filter, getContext(null, null, 'frontoffice'), function testFunction(err, data) {
        expect(err).to.not.exist;
        expect(data).to.be.an('array').of.length(0);
        /* Reset fields */
        filter.fields = {
          id: true,
          name: true,
          status: true
        };
        models.Task.filtered(filter, getContext(null, null, 'backoffice'), function testFunction(err, data) {
          expect(err).to.not.exist;
          expect(data).to.be.an('array').of.length(1);
          done();
        });
      });
    });


    it('excludedGroups cannot complete task', function testFunction(done) {
      userTask.complete({}, getContext(null, null, 'midoffice'), function testFunction(err, data) {
        expect(err).to.exist;
        expect(err.code).to.equal('TASK_NOT_ASSIGNED');
        expect(err.status).to.equal(403);
        done();
      });
    });

    it('unrelated groups can not complete the task', function testFunction(done) {
      userTask.complete({}, getContext(null, null, 'retail'), function testFunction(err, data) {
        expect(err).to.exist;
        expect(err.code).to.equal('TASK_NOT_ASSIGNED');
        expect(err.status).to.equal(403);
        done();
      });
    });

    it('candidate groups can complete the task and process instance', function testFunction(done) {
      bootstrap.onComplete(workflowName, function testFunction(err, inst) {
        expect(err).to.not.exist;
        stateVerifier.isComplete(inst);
        stateVerifier.verifyTokens(inst, [{
          name: 'Start',
          status: Status.COMPLETE
        }, {
          name: 'UserTask',
          status: Status.COMPLETE
        }, {
          name: 'End',
          status: Status.COMPLETE
        }]);
        done();
      });
      userTask.complete({}, getContext(null, null, 'backoffice'), function testFunction(err, task) {
        expect(err).to.not.exist;
        expect(task.status).to.equal(Status.COMPLETE);
      });
    });
  });

  describe('Candidate and Excluded Roles', function testFunction() {
    let processInstance;
    let userTask;
    let workflowPayload = {
      processVariables: {
        cRoles: ['admin', 'manager'],
        eRoles: ['teller']
      },
      message: {}
    };
    before('Trigger workflow', function testFunction(done) {
      bootstrap.triggerWaitForUserTask(workflowName, workflowPayload, 'UserTask', function testFunction(err, wfInst, procInst, task) {
        expect(err).to.not.exist;
        processInstance = procInst;
        userTask = task;
        done();
      });
    });
    after('remove listeners', function testFunction(done) {
      bootstrap.removeCompleteListener(workflowName);
      bootstrap.removeUserTaskListener(workflowName, 'UserTask');
      done();
    });
    it('waits on user-task', function testFunction(done) {
      expect(processInstance).to.exist;
      expect(processInstance.passiveWait).to.be.true;
      var userTaskToken = stateVerifier.fetchTokenByName(processInstance, 'UserTask');
      expect(userTaskToken).to.exist;
      expect(userTaskToken.status).to.equal(Status.PENDING);
      stateVerifier.isRunning(processInstance);
      stateVerifier.verifyTokens(processInstance, [{
        name: 'Start',
        status: Status.COMPLETE
      }, {
        name: 'UserTask',
        status: Status.PENDING
      }]);
      done();
    });

    it('populates candidate and excludedRoles through placeholder', function testFunction(done) {
      expect(processInstance).to.exist;
      processInstance.tasks({}, bootstrap.defaultContext, function testFunction(err, tasks) {
        expect(err).to.not.exist;
        expect(tasks).to.exist.and.be.an('array').of.length(1);
        var task = tasks[0];
        expect(task.status).to.equal(Status.PENDING);
        expect(task.candidateRoles).to.have.members(['admin', 'manager']);
        expect(task.excludedRoles).to.have.members(['teller']);
        done();
      });
    });

    it('filtered: Fetches tasks for candidateRoles', function testFunction(done) {
      let filter = {
        where: {
          id: userTask.id
        }
      };
      models.Task.filtered(filter, getContext(null, ['admin']), function testFunction(err, data) {
        expect(err).to.not.exist;
        expect(data).to.be.an('array').of.length(1);
        done();
      });
    });

    it('filtered: Does not fetch tasks for excludedRoles', function testFunction(done) {
      let filter = {
        where: {
          id: userTask.id
        }
      };
      models.Task.filtered(filter, getContext(null, ['teller']), function testFunction(err, data) {
        expect(err).to.not.exist;
        expect(data).to.be.an('array').of.length(0);
        done();
      });
    });

    it('filtered: works when fields filter is applied', function testFunction(done) {
      let filter = {
        fields: {
          id: true,
          name: true,
          status: true
        },
        where: {
          id: userTask.id
        }
      };
      models.Task.filtered(filter, getContext(null, ['teller']), function testFunction(err, data) {
        expect(err).to.not.exist;
        expect(data).to.be.an('array').of.length(0);
        /* Reset fields */
        filter.fields = {
          id: true,
          name: true,
          status: true
        };
        models.Task.filtered(filter, getContext(null, ['manager']), function testFunction(err, data) {
          expect(err).to.not.exist;
          expect(data).to.be.an('array').of.length(1);
          // TODO - Check that we only get the required fields.
          // May be fields filter works only on remote methods?
          // expect(data[0].toObject()).to.have.keys(['id', 'name', 'status']);
          done();
        });
      });
    });

    it('excludedRoles cannot complete task', function testFunction(done) {
      userTask.complete({}, getContext(null, ['teller']), function testFunction(err, data) {
        expect(err).to.exist;
        expect(err.code).to.equal('TASK_NOT_ASSIGNED');
        expect(err.status).to.equal(403);
        done();
      });
    });

    it('unrelated roles can not complete the task', function testFunction(done) {
      userTask.complete({}, getContext(null, ['other']), function testFunction(err, data) {
        expect(err).to.exist;
        expect(err.code).to.equal('TASK_NOT_ASSIGNED');
        expect(err.status).to.equal(403);
        done();
      });
    });

    it('candidate roles can complete the task and process instance', function testFunction(done) {
      bootstrap.onComplete(workflowName, function testFunction(err, inst) {
        expect(err).to.not.exist;
        stateVerifier.isComplete(inst);
        stateVerifier.verifyTokens(inst, [{
          name: 'Start',
          status: Status.COMPLETE
        }, {
          name: 'UserTask',
          status: Status.COMPLETE
        }, {
          name: 'End',
          status: Status.COMPLETE
        }]);
        done();
      });
      userTask.complete({}, getContext(null, ['manager']), function testFunction(err, task) {
        expect(err).to.not.exist;
        expect(task.status).to.equal(Status.COMPLETE);
      });
    });
  });

  describe('No Candidates', function testFunction() {
    let userTask;
    let workflowPayload = {
      processVariables: {
        eUsers: 'user2',
        eRoles: ['teller', 'admin'],
        eGroups: 'backoffice'
      },
      message: {}
    };
    before(function testFunction(done) {
      bootstrap.triggerWaitForUserTask(workflowName, workflowPayload, 'UserTask', function testFunction(err, wfInst, procInst, task) {
        expect(err).to.not.exist;
        userTask = task;
        done();
      });
    });

    after('remove listeners', function testFunction(done) {
      bootstrap.removeCompleteListener(workflowName);
      bootstrap.removeUserTaskListener(workflowName, 'UserTask');
      done();
    });
    it('filtered: Fetches tasks for non-excluded users', function testFunction(done) {
      let filter = {
        where: {
          id: userTask.id
        }
      };
      models.Task.filtered(filter, getContext('other', ['other'], 'other'), function testFunction(err, data) {
        expect(err).to.not.exist;
        expect(data).to.be.an('array').of.length(1);
        done();
      });
    });

    it('filtered: Does not fetch tasks for excludedUsers', function testFunction(done) {
      let filter = {
        where: {
          id: userTask.id
        }
      };
      models.Task.filtered(filter, getContext('user2', ['other'], 'other'), function testFunction(err, data) {
        expect(err).to.not.exist;
        expect(data).to.be.an('array').of.length(0);
        done();
      });
    });

    it('filtered: Does not fetch tasks for excludedRoles', function testFunction(done) {
      let filter = {
        where: {
          id: userTask.id
        }
      };
      models.Task.filtered(filter, getContext('other', ['teller'], 'other'), function testFunction(err, data) {
        expect(err).to.not.exist;
        expect(data).to.be.an('array').of.length(0);
        done();
      });
    });

    it('filtered: Does not fetch tasks for excludedGroups', function testFunction(done) {
      let filter = {
        where: {
          id: userTask.id
        }
      };
      models.Task.filtered(filter, getContext('other', ['other'], 'backoffice'), function testFunction(err, data) {
        expect(err).to.not.exist;
        expect(data).to.be.an('array').of.length(0);
        done();
      });
    });

    it('non-excluded can complete task', function testFunction(done) {
      bootstrap.onComplete(workflowName, function testFunction(err, inst) {
        expect(err).to.not.exist;
        stateVerifier.isComplete(inst);
        stateVerifier.verifyTokens(inst, [{
          name: 'Start',
          status: Status.COMPLETE
        }, {
          name: 'UserTask',
          status: Status.COMPLETE
        }, {
          name: 'End',
          status: Status.COMPLETE
        }]);
        done();
      });
      userTask.complete({}, getContext('other', ['other'], 'other'), function testFunction(err, task) {
        expect(err).to.not.exist;
        expect(task.status).to.equal(Status.COMPLETE);
      });
    });
  });

  describe('Task Delegation', function testFunction() {
    let userTask;
    let workflowPayload = {
      processVariables: {
        eUsers: 'user2',
        eRoles: ['teller', 'admin'],
        eGroups: 'backoffice'
      },
      message: {}
    };
    before(function testFunction(done) {
      bootstrap.triggerWaitForUserTask(workflowName, workflowPayload, 'UserTask', function testFunction(err, wfInst, procInst, task) {
        expect(err).to.not.exist;
        userTask = task;
        done();
      });
    });
    after('remove listeners', function testFunction(done) {
      bootstrap.removeCompleteListener(workflowName);
      bootstrap.removeUserTaskListener(workflowName, 'UserTask');
      done();
    });

    it('Task delegate errors when no assignee user, role or group specified', function testFunction(done) {
      expect(userTask).to.exist;
      userTask.delegate({}, bootstrap.defaultContext, function testFunction(err, task) {
        expect(err).to.exist;
        expect(err.status).to.equal(400);
        expect(err.code).to.equal('INVALID_DATA');
        done();
      });
    });

    it('Task can be delegated to an assignee', function testFunction(done) {
      expect(userTask).to.exist;
      expect(userTask.candidateUsers).to.not.have.members(['user1']);
      userTask.delegate({
        assignee: 'user1',
        role: [],
        group: []
      }, bootstrap.defaultContext, function testFunction(err, task) {
        expect(err).to.not.exist;
        expect(task.candidateUsers).to.have.members(['user1']);
        userTask = task;
        done();
      });
    });

    it('Task can be delegated to  [assignee]', function testFunction(done) {
      expect(userTask).to.exist;
      expect(userTask.candidateUsers).to.not.have.members(['user2', 'user3']);
      userTask.delegate({
        assignee: ['user2', 'user3'],
        role: [],
        group: []
      }, bootstrap.defaultContext, function testFunction(err, task) {
        expect(err).to.not.exist;
        expect(task.candidateUsers).to.have.members(['user2', 'user3']);
        userTask = task;
        done();
      });
    });


    it('Task can be delegated to a role', function testFunction(done) {
      expect(userTask).to.exist;
      expect(userTask.candidateRoles).to.not.have.members(['admin']);
      userTask.delegate({
        assignee: [],
        role: 'admin',
        group: []
      }, bootstrap.defaultContext, function testFunction(err, task) {
        expect(err).to.not.exist;
        expect(task.candidateRoles).to.have.members(['admin']);
        userTask = task;
        done();
      });
    });

    it('Task can be delegated to [role]', function testFunction(done) {
      expect(userTask).to.exist;
      expect(userTask.candidateRoles).to.not.have.members(['manager']);
      userTask.delegate({
        assignee: [],
        role: ['manager'],
        group: []
      }, bootstrap.defaultContext, function testFunction(err, task) {
        expect(err).to.not.exist;
        expect(task.candidateRoles).to.have.members(['manager']);
        userTask = task;
        done();
      });
    });

    it('Task can be delegated to a group', function testFunction(done) {
      expect(userTask).to.exist;
      expect(userTask.candidateGroups).to.not.have.members(['backoffice']);
      userTask.delegate({
        assignee: [],
        role: [],
        group: 'backoffice'
      }, bootstrap.defaultContext, function testFunction(err, task) {
        expect(err).to.not.exist;
        expect(task.candidateGroups).to.have.members(['backoffice']);
        userTask = task;
        done();
      });
    });

    it('Task can be delegated to [group]', function testFunction(done) {
      expect(userTask).to.exist;
      expect(userTask.candidateGroups).to.not.have.members(['frontoffice']);
      userTask.delegate({
        assignee: [],
        role: [],
        group: ['frontoffice']
      }, bootstrap.defaultContext, function testFunction(err, task) {
        expect(err).to.not.exist;
        expect(task.candidateGroups).to.have.members(['frontoffice']);
        userTask = task;
        done();
      });
    });

    it('Task comments can be updated through delegate', function testFunction(done) {
      let newComments = 'the task comments';
      expect(userTask).to.exist;
      expect(userTask.comments).to.not.equal(newComments);
      userTask.delegate({
        comments: newComments,
        assignee: 'user5',
        role: [],
        group: []
      }, bootstrap.defaultContext, function testFunction(err, task) {
        expect(err).to.not.exist;
        expect(task.comments).to.equal(newComments);
        userTask = task;
        done();
      });
    });

    it('When role is excluded but user is candidate, user can complete the task', function testFunction(done) {
      bootstrap.onComplete(workflowName, function testFunction(err, instance) {
        expect(err).to.not.exist;
        stateVerifier.isComplete(instance);
        done();
      });

      expect(userTask).to.exist;
      expect(userTask.candidateUsers).to.not.have.members(['admin']);
      userTask.delegate({
        assignee: 'admin',
        role: [],
        group: []
      }, bootstrap.defaultContext, function testFunction(err, task) {
        expect(err).to.not.exist;
        expect(task.candidateUsers).to.have.members(['admin']);
        expect(task.candidateRoles).to.not.have.members(['admin']);
        expect(task.excludedRoles).to.have.members(['admin', 'teller']);
        task.complete({}, getContext('admin', ['admin']), function testFunction(err, task) {
          expect(err).to.not.exist;
          expect(task.status).to.equal(Status.COMPLETE);
        });
      });
    });
  });

  describe('Task Dates', function testFunction() {
    let userTask;
    let workflowPayload = {
      processVariables: {
        followUpDate: '5d',
        dueDate: '1w',
        priority: '1'
      }
    };
    before(function testFunction(done) {
      bootstrap.triggerWaitForUserTask(workflowName, workflowPayload, 'UserTask', function testFunction(err, wfInst, procInst, task) {
        expect(err).to.not.exist;
        expect(wfInst).to.exist;
        expect(task).to.exist;
        userTask = task;
        done();
      });
    });
    after('remove listeners', function testFunction(done) {
      bootstrap.removeCompleteListener(workflowName);
      bootstrap.removeUserTaskListener(workflowName, 'UserTask');
      done();
    });

    it('Populates due date and followup date', function testFunction(done) {
      var dueDate = oeDateUtils.parseShorthand(workflowPayload.processVariables.dueDate);
      var followUpDate = oeDateUtils.parseShorthand(workflowPayload.processVariables.followUpDate);
      expect(userTask).to.have.a.property('dueDate').that.deep.equals(dueDate);
      expect(userTask).to.have.a.property('followUpDate').that.deep.equals(followUpDate);
      done();
    });

    it('Populates priority', function testFunction(done) {
      expect(userTask).to.have.a.property('priority').that.equals(workflowPayload.processVariables.priority);
      done();
    });
  });

  describe('Task Completion', function testFunction() {
    let userTask;
    let workflowPayload = {
      processVariables: {},
      message: {}
    };
    beforeEach(function testFunction(done) {
      bootstrap.triggerWaitForUserTask(workflowName, workflowPayload, 'UserTask', function testFunction(err, wfInst, procInst, task) {
        expect(err).to.not.exist;
        userTask = task;
        done();
      });
    });

    afterEach(function testFunction(done) {
      userTask = null;
      bootstrap.removeCompleteListener(workflowName);
      bootstrap.removeUserTaskListener(workflowName, 'UserTask');
      done();
    });
    it('Completed task, can not be completed', function testFunction(done) {
      expect(userTask).to.exist;
      bootstrap.onComplete(workflowName, function testFunction(err, inst) {
        expect(err).to.not.exist;
        stateVerifier.isComplete(inst);
        stateVerifier.verifyTokens(inst, [{
          name: 'Start',
          status: Status.COMPLETE
        }, {
          name: 'UserTask',
          status: Status.COMPLETE
        }, {
          name: 'End',
          status: Status.COMPLETE
        }]);
        userTask.complete({}, getContext('other', ['other'], 'other'), function testFunction(err, task) {
          expect(err).to.exist;
          expect(err.code).to.equal('TASK_ALREADY_COMPLETED');
          expect(err.status).to.equal(409);
          done();
        });
      });
      userTask.complete({}, getContext('other', ['other'], 'other'), function testFunction(err, task) {
        expect(err).to.not.exist;
        expect(task.status).to.equal(Status.COMPLETE);
        userTask = task;
      });
    });

    it('process-variables and message can be passed to complete {msg:{}, pv:{}}', function testFunction(done) {
      var completionData = {
        pv: {
          field1: 'value1'
        },
        msg: {
          text: 'the message'
        }
      };
      expect(userTask).to.exist;
      bootstrap.onComplete(workflowName, function testFunction(err, inst) {
        expect(err).to.not.exist;
        stateVerifier.isComplete(inst);
        stateVerifier.verifyTokens(inst, [{
          name: 'Start',
          status: Status.COMPLETE
        }, {
          name: 'UserTask',
          status: Status.COMPLETE
        }, {
          name: 'End',
          status: Status.COMPLETE
        }]);

        stateVerifier.verifyPV(inst, completionData.pv);

        let endToken = stateVerifier.fetchTokenByName(inst, 'End');
        expect(endToken.message).to.deep.equal(completionData.msg);
        done();
      });
      userTask.complete(completionData, getContext('other', ['other'], 'other'), function testFunction(err, task) {
        expect(err).to.not.exist;
        expect(task.status).to.equal(Status.COMPLETE);
        userTask = task;
      });
    });

    it('Comments can be populated through task-complete', function testFunction(done) {
      var completionData = {
        __comments__: 'task completion comments'
      };
      expect(userTask).to.exist;
      bootstrap.onComplete(workflowName, function testFunction(err, inst) {
        expect(err).to.not.exist;
        stateVerifier.isComplete(inst);
        done();
      });
      userTask.complete(completionData, getContext('other', ['other'], 'other'), function testFunction(err, task) {
        expect(err).to.not.exist;
        expect(task.status).to.equal(Status.COMPLETE);
        expect(task.comments).to.equal(completionData.__comments__);
        userTask = task;
      });
    });

    it('Completed task can not be delegated', function testFunction(done) {
      var completionData = {
        __comments__: 'task completion comments'
      };
      expect(userTask).to.exist;
      bootstrap.onComplete(workflowName, function testFunction(err, inst) {
        expect(err).to.not.exist;
        stateVerifier.isComplete(inst);
        userTask.delegate({
          assignee: [],
          role: 'admin',
          group: []
        }, bootstrap.defaultContext, function testFunction(err, task) {
          expect(err).to.exist;
          expect(err.code).to.equal('TASK_ALREADY_COMPLETED');
          expect(err.status).to.equal(409);
          expect(task).to.not.exist;
          done();
        });
      });
      userTask.complete(completionData, getContext('other', ['other'], 'other'), function testFunction(err, task) {
        expect(err).to.not.exist;
        expect(task.status).to.equal(Status.COMPLETE);
        userTask = task;
      });
    });

    it('Comments can be updated through updateComments', function testFunction(done) {
      let newComments = 'new comments';
      let usrContext = getContext('other', ['other'], 'other');
      expect(userTask).to.exist;
      expect(userTask.comments).to.not.equal(newComments);
      bootstrap.onComplete(workflowName, done);
      userTask.updateComments({}, usrContext, function testFunction(err, task) {
        /* Comments are mandatory */
        expect(err).to.exist;
        expect(err.code).to.equal('INVALID_DATA');
        expect(err.status).to.equal(400);

        userTask.updateComments({
          comments: 'new comments'
        }, usrContext, function testFunction(err, task) {
          expect(err).to.not.exist;
          expect(task.status).to.not.equal(Status.COMPLETE);
          expect(task.comments).to.equal(newComments);

          task.complete({}, getContext('other', ['other'], 'other'), function testFunction(err, task) {
            expect(err).to.not.exist;
            userTask = task;
          });
        });
      });
    });

    it('Comments can not be updated for completed tasks', function testFunction(done) {
      let newComments = 'new comments';
      expect(userTask).to.exist;
      bootstrap.onComplete(workflowName, function testFunction(err, inst) {
        expect(err).to.not.exist;
        stateVerifier.isComplete(inst);
        userTask.updateComments({
          comments: newComments
        }, getContext('other', ['other'], 'other'), function testFunction(err, task) {
          expect(err).to.exist;
          expect(err.code).to.equal('TASK_ALREADY_COMPLETED');
          expect(err.status).to.equal(409);
          expect(task).to.not.exist;
          done();
        });
      });
      userTask.complete({}, getContext('other', ['other'], 'other'), function testFunction(err, task) {
        expect(err).to.not.exist;
        expect(task.status).to.equal(Status.COMPLETE);
        userTask = task;
      });
    });

    it('followUpDate can be updated through updateFollowUpDate', function testFunction(done) {
      let newFollowUpDate = '22-11-2020';
      let usrContext = getContext('other', ['other'], 'other');
      expect(userTask).to.exist;
      expect(userTask.followUpDate).to.not.equal(newFollowUpDate);
      bootstrap.onComplete(workflowName, done);
      userTask.updateFollowUpDate({}, usrContext, function testFunction(err, task) {
        /* followUpDate is mandatory */
        expect(err).to.exist;
        expect(err.code).to.equal('INVALID_DATA');
        expect(err.status).to.equal(400);

        userTask.updateFollowUpDate({
          followUpDate: newFollowUpDate
        }, usrContext, function testFunction(err, task) {
          expect(err).to.not.exist;
          expect(task.status).to.not.equal(Status.COMPLETE);
          expect(task).to.have.a.property('followUpDate').that.deep.equals(oeDateUtils.parseShorthand(newFollowUpDate));
          task.complete({}, getContext('other', ['other'], 'other'), function testFunction(err, task) {
            expect(err).to.not.exist;
            userTask = task;
          });
        });
      });
    });

    it('followUpDate can be set to null through updateFollowUpDate', function testFunction(done) {
      let newFollowUpDate = null;
      let usrContext = getContext('other', ['other'], 'other');
      expect(userTask).to.exist;
      expect(userTask.followUpDate).to.not.equal(newFollowUpDate);
      bootstrap.onComplete(workflowName, done);
      userTask.updateFollowUpDate({
        followUpDate: newFollowUpDate
      }, usrContext, function testFunction(err, task) {
        expect(err).to.not.exist;
        expect(task.status).to.not.equal(Status.COMPLETE);
        expect(task).to.have.a.property('followUpDate').that.equals(null);
        task.complete({}, getContext('other', ['other'], 'other'), function testFunction(err, task) {
          expect(err).to.not.exist;
          userTask = task;
        });
      });

    });

    it('invalid followUpDate cannot be updated through updateFollowUpDate', function testFunction(done) {
      let newFollowUpDate = 'invalid-date';
      let usrContext = getContext('other', ['other'], 'other');
      expect(userTask).to.exist;
      expect(userTask.followUpDate).to.not.equal(newFollowUpDate);
      bootstrap.onComplete(workflowName, done);
      userTask.updateFollowUpDate({
        followUpDate: newFollowUpDate
      }, usrContext, function testFunction(err, task) {
        expect(err).to.exist;
        expect(err.code).to.equal('INVALID_DATA');
        expect(err.statusCode).to.equal(422);
        done();
      });
    });

    it('followUpDate cannot be updated for completed tasks', function testFunction(done) {
      let newFollowUpDate = '18-06-2020';
      expect(userTask).to.exist;
      bootstrap.onComplete(workflowName, function testFunction(err, inst) {
        expect(err).to.not.exist;
        stateVerifier.isComplete(inst);
        userTask.updateFollowUpDate({
          followUpDate: newFollowUpDate
        }, getContext('other', ['other'], 'other'), function testFunction(err, task) {
          expect(err).to.exist;
          expect(err.code).to.equal('TASK_ALREADY_COMPLETED');
          expect(err.status).to.equal(409);
          expect(task).to.not.exist;
          done();
        });
      });
      userTask.complete({}, getContext('other', ['other'], 'other'), function testFunction(err, task) {
        expect(err).to.not.exist;
        expect(task.status).to.equal(Status.COMPLETE);
        userTask = task;
      });
    });
  });

  describe('Workflow Retry on user-task', function testFunction() {
    let userTask;
    let processInstance;
    let workflowPayload = {
      processVariables: {
        followUpDate: '5d',
        dueDate: '1w',
        priority: '1'
      }
    };
    before(function testFunction(done) {
      bootstrap.triggerWaitForUserTask(workflowName, workflowPayload, 'UserTask', function testFunction(err, wfInst, procInst, task) {
        expect(err).to.not.exist;
        expect(wfInst).to.exist;
        expect(task).to.exist;
        userTask = task;
        processInstance = procInst;
        done();
      });
    });
    after('remove listeners', function testFunction(done) {
      bootstrap.removeCompleteListener(workflowName);
      bootstrap.removeUserTaskListener(workflowName, 'UserTask');
      done();
    });

    beforeEach('Fetch fresh process-instance', function fetchInstance(done) {
      models.ProcessInstance.findById(processInstance.id, bootstrap.defaultContext, function fetchCb(err, instance) {
        expect(err).to.not.exist;
        expect(instance).to.exist;
        processInstance = instance;
        done();
      });
    });

    it('Does not create a new user-task if it exists', function testFunction(done) {
      let timeout;
      bootstrap.onUserTask(workflowName, 'UserTask', function cb(err, task) {
        expect(err).to.not.exist;
        timeout && clearTimeout(timeout);
        done(new Error('Not expecting a new task to be created'));
      });
      stateVerifier.isRunning(processInstance);
      let taskToken = stateVerifier.fetchTokenByName(processInstance, 'UserTask');
      taskToken.status = Status.FAILED;
      processInstance.updateAttributes({
        _version: processInstance._version,
        _processTokens: processInstance._processTokens
      }, bootstrap.defaultContext, function cb(err, procInst) {
        expect(err).to.not.exist;
        expect(procInst).to.exist;
        processInstance = procInst;
        /* Trigger retry */
        processInstance.retry(taskToken.id, {}, bootstrap.defaultContext, function cb(err, response) {
          expect(err).to.not.exist;
          expect(response).to.exist.and.deep.equal({
            emitted: true
          });
          /* Wait for 1.5 seconds */
          timeout = setTimeout(function cb() {
            bootstrap.removeUserTaskListener(workflowName, 'UserTask');
            done();
          }, 1500);
        });
      });
    });

    it('Creates a new user-task if does not exist', function testFunction(done) {
      bootstrap.onUserTask(workflowName, 'UserTask', function cb(err, task) {
        expect(err).to.not.exist;
        expect(task).to.exist;
        expect(task.id).to.not.equal(userTask.id);
        done();
      });
      stateVerifier.isRunning(processInstance);
      let taskToken = stateVerifier.fetchTokenByName(processInstance, 'UserTask');
      taskToken.status = Status.FAILED;
      processInstance.updateAttributes({
        _version: processInstance._version,
        _processTokens: processInstance._processTokens
      }, bootstrap.defaultContext, function cb1(err, procInst) {
        expect(err).to.not.exist;
        expect(procInst).to.exist;
        processInstance = procInst;
        userTask.destroy(bootstrap.defaultContext, function cb2(err, data) {
          expect(err).to.not.exist;
          expect(data).to.exist.and.have.property('count').that.equals(1);
          /* Trigger retry */
          processInstance.retry(taskToken.id, {}, bootstrap.defaultContext, function cb3(err, response) {
            expect(err).to.not.exist;
            expect(response).to.exist.and.deep.equal({
              emitted: true
            });
          });
        });
      });
    });
  });
});
