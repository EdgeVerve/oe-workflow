/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

let bootstrap = require('../bootstrap.js');
let chai = bootstrap.chai;
let expect = chai.expect;
let Status = bootstrap.Status;
let stateVerifier = require('../utils/state-verifier');
let async = require('async');

describe('Lanes and Pools Tests', function CB() {
  let workflowName = 'lanes-pools';
  let workflowDefinition;
  let allTasks = {};
  before('define workflow', function testFunction(done) {
    async.map(['Task1A', 'Task1B', 'Task2A', 'Task2B', 'Task3A', 'Task3B', 'Task4A', 'Task4B', {
      wf: '$Sub',
      name: 'SubTask'
    }], function mapFunc(item, cb) {
      if (item.wf && item.name) {
        bootstrap.onUserTask(workflowName + '$proc' + item.wf, item.name, function taskCreated(err, task, instance) {
          cb(err, task);
        });
      } else {
        bootstrap.onUserTask(workflowName + '$proc', item, function taskCreated(err, task, instance) {
          cb(err, task);
        });
      }
    }, function asyncCallback(err, data) {
      expect(err).to.not.exist;
      expect(data).to.be.an('array').of.length(9);
      allTasks.task1A = data[0];
      allTasks.task1B = data[1];
      allTasks.task2A = data[2];
      allTasks.task2B = data[3];
      allTasks.task3A = data[4];
      allTasks.task3B = data[5];
      allTasks.task4A = data[6];
      allTasks.task4B = data[7];
      allTasks.SubTask = data[8];
      done();
    });
    bootstrap.loadAndTrigger(workflowName, {}, function testFunction(err, wfDefn, wfInstance) {
      expect(err).to.not.exist;
      expect(wfInstance).to.exist;
      workflowDefinition = wfDefn;
    });
  });
  after('cleanup data', function testFunction(done) {
    bootstrap.removeCompleteListener(workflowName + '$proc');
    bootstrap.removeCompleteListener(workflowName + '$proc$Sub');
    bootstrap.cleanUp(workflowName, done);
  });

  afterEach(function testFunction(done) {
    bootstrap.removeUserTaskListener(workflowName + '$proc', 'Task1A');
    bootstrap.removeUserTaskListener(workflowName + '$proc', 'Task1B');
    bootstrap.removeUserTaskListener(workflowName + '$proc', 'Task2A');
    bootstrap.removeUserTaskListener(workflowName + '$proc', 'Task2B');
    bootstrap.removeUserTaskListener(workflowName + '$proc', 'Task3A');
    bootstrap.removeUserTaskListener(workflowName + '$proc', 'Task3B');
    bootstrap.removeUserTaskListener(workflowName + '$proc', 'Task4A');
    bootstrap.removeUserTaskListener(workflowName + '$proc', 'Task4B');
    bootstrap.removeUserTaskListener(workflowName + '$proc$Sub', 'SubTask');
    done();
  });

  function getContext(usr, roles, group) {
    if (typeof roles === 'string') {
      roles = [roles];
    }
    return {
      ctx: {
        username: usr,
        roles: roles,
        group: group
      }
    };
  }

  it('Process Definition contains the lanes information', function testFunction(done) {
    workflowDefinition.processDefinitions({}, bootstrap.defaultContext, function testFunction(err, procDefns) {
      expect(err).to.not.exist;
      expect(procDefns).to.exist.and.be.an('array').of.length(2);
      let mainProcessDefn = procDefns.find(v => {
        return v.name === workflowName + '$proc';
      });
      let subProcessDefn = procDefns.find(v => {
        return v.name === workflowName + '$proc$Sub';
      });
      expect(mainProcessDefn).to.exist;
      expect(mainProcessDefn.processDefinition.lanes).to.exist.and.be.an('array').of.length(5);

      expect(mainProcessDefn.processDefinition.lanes.map(v => v.name)).to.have.members(['User:admin', 'Group:admin', 'Role:admin', 'admin', 'admin']);

      expect(subProcessDefn).to.exist;
      expect(subProcessDefn.processDefinition.lanes).to.exist.and.be.an('array').of.length(0);
      done();
    });
  });

  it('For poolname User:xyz, xyz is appended to candidate users (candidateUsers specified)', function testFunction(done) {
    let task = allTasks.task1A;
    expect(task).to.exist;
    expect(task.candidateUsers).to.have.members(['john', 'admin']);
    expect(task.candidateRoles).to.not.exist;
    expect(task.candidateGroups).to.not.exist;
    expect(task.status).to.equal(Status.PENDING);
    task.complete({}, getContext('admin', null, null), function testFunction(err, task) {
      expect(err).to.not.exist;
      expect(task.status).to.equal(Status.COMPLETE);
      done();
    });
  });

  it('For poolname User:xyz, xyz is used as candidate users (candidateUsers not specified)', function testFunction(done) {
    let task = allTasks.task1B;
    expect(task).to.exist;
    expect(task.candidateUsers).to.have.members(['admin']);
    expect(task.candidateRoles).to.not.exist;
    expect(task.candidateGroups).to.not.exist;
    expect(task.status).to.equal(Status.PENDING);
    task.complete({}, getContext('admin', null, null), function testFunction(err, task) {
      expect(err).to.not.exist;
      expect(task.status).to.equal('complete');
      done();
    });
  });

  it('For poolname Group:xyz, xyz is appended to candidate groups (candidateGroups specified)', function testFunction(done) {
    let task = allTasks.task2A;
    expect(task).to.exist;
    expect(task.candidateGroups).to.have.members(['frontoffice', 'admin']);
    expect(task.candidateRoles).to.not.exist;
    expect(task.candidateUsers).to.not.exist;
    expect(task.status).to.equal(Status.PENDING);
    task.complete({}, getContext(null, null, 'admin'), function testFunction(err, task) {
      expect(err).to.not.exist;
      expect(task.status).to.equal('complete');
      done();
    });
  });

  it('For poolname Group:xyz, xyz is used as candidate groups (candidateGroups not specified)', function testFunction(done) {
    let task = allTasks.task2B;
    expect(task).to.exist;
    expect(task.candidateGroups).to.have.members(['admin']);
    expect(task.candidateRoles).to.not.exist;
    expect(task.candidateUsers).to.not.exist;
    expect(task.status).to.equal(Status.PENDING);
    task.complete({}, getContext(null, null, 'admin'), function testFunction(err, task) {
      expect(err).to.not.exist;
      expect(task.status).to.equal('complete');
      done();
    });
  });

  it('For poolname Role:xyz, xyz is appended to candidate roles (candidateGroups specified)', function testFunction(done) {
    let task = allTasks.task3A;
    expect(task).to.exist;
    expect(task.candidateRoles).to.have.members(['approvers', 'admin']);
    expect(task.candidateGroups).to.not.exist;
    expect(task.candidateUsers).to.not.exist;
    expect(task.status).to.equal(Status.PENDING);
    task.complete({}, getContext(null, 'admin', null), function testFunction(err, task) {
      expect(err).to.not.exist;
      expect(task.status).to.equal('complete');
      done();
    });
  });


  it('For poolname Role:xyz, xyz is used as candidate roles (candidateGroups not specified)', function testFunction(done) {
    let task = allTasks.task3B;
    expect(task).to.exist;
    expect(task.candidateRoles).to.have.members(['admin']);
    expect(task.candidateGroups).to.not.exist;
    expect(task.candidateUsers).to.not.exist;
    expect(task.status).to.equal(Status.PENDING);
    task.complete({}, getContext(null, 'admin', null), function testFunction(err, task) {
      expect(err).to.not.exist;
      expect(task.status).to.equal('complete');
      done();
    });
  });

  it('For poolname xyz, xyz is appended to candidate users (candidateUsers specified)', function testFunction(done) {
    let task = allTasks.task4A;
    expect(task).to.exist;
    expect(task.candidateUsers).to.have.members(['rob', 'admin']);
    expect(task.candidateRoles).to.not.exist;
    expect(task.candidateGroups).to.not.exist;
    expect(task.status).to.equal(Status.PENDING);
    task.complete({}, getContext('admin', null, null), function testFunction(err, task) {
      expect(err).to.not.exist;
      expect(task.status).to.equal('complete');
      done();
    });
  });

  it('For poolname xyz, xyz is used as candidate users (candidateUsers not specified)', function testFunction(done) {
    let task = allTasks.task4B;
    expect(task).to.exist;
    expect(task.candidateUsers).to.have.members(['admin']);
    expect(task.candidateRoles).to.not.exist;
    expect(task.candidateGroups).to.not.exist;
    expect(task.status).to.equal(Status.PENDING);
    task.complete({}, getContext('admin', null, null), function testFunction(err, task) {
      expect(err).to.not.exist;
      expect(task.status).to.equal('complete');
      done();
    });
  });

  it('Poolname does NOT affect candidates in subprocess', function testFunction(done) {
    let task = allTasks.SubTask;
    expect(task).to.exist;
    expect(task.candidateUsers).to.have.members(['default']);
    expect(task.candidateUsers).to.not.include('admin');
    expect(task.candidateRoles).to.not.exist;
    expect(task.candidateGroups).to.not.exist;
    expect(task.status).to.equal(Status.PENDING);
    task.complete({}, getContext('default', null, null), function testFunction(err, task) {
      expect(err).to.not.exist;
      expect(task.status).to.equal('complete');
      done();
    });
  });

  it('Workflow completes', function testFunction(done) {
    async.parallel([function subprocessCompletion(callback) {
      bootstrap.onComplete(workflowName + '$proc$Sub', function testFunction(err, instance) {
        expect(err).to.not.exist;
        expect(instance).to.exist;
        stateVerifier.isComplete(instance);
        callback(null, true);
      });
    }, function mainprocessCompletion(callback) {
      bootstrap.onComplete(workflowName + '$proc', function testFunction(err, instance) {
        expect(err).to.not.exist;
        expect(instance).to.exist;
        stateVerifier.isComplete(instance);
        callback(null, true);
      });
    }], done);
  });
});

