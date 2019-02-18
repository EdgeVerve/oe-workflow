/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

let bootstrap = require('../bootstrap.js');
let chai = bootstrap.chai;
let expect = chai.expect;
let async = require('async');

describe('User Task Hook Tests', function callback() {
  let workflowName = 'user-task-hook';
  let taskWithHook;
  let taskInvalidHook;
  let taskNoHook;
  let processInstance;
  before('define workflow', function testFunction(done) {
    async.parallel([
      function testFunction(cb) {
        bootstrap.onUserTask(workflowName, 'TaskWithHook', function testFunction(err, task, instance) {
          expect(err).to.not.exist;
          taskWithHook = task;
          processInstance = instance;
          cb();
        });
      },
      function testFunction(cb) {
        bootstrap.onUserTask(workflowName, 'TaskInvalidHook', function testFunction(err, task, instance) {
          expect(err).to.not.exist;
          taskInvalidHook = task;
          processInstance = instance;
          cb();
        });
      },
      function testFunction(cb) {
        bootstrap.onUserTask(workflowName, 'TaskNoHook', function testFunction(err, task, instance) {
          expect(err).to.not.exist;
          taskNoHook = task;
          processInstance = instance;
          cb();
        });
      }
    ], function testFunction(err, results) {
      done(err);
    });

    bootstrap.loadAndTrigger(workflowName, {
      processVariables: {
        testingHook: true,
        sla: 5
      }
    }, function testFunction(err) {
      expect(err).to.not.exist;
    });
  });

  after('cleanup data', function testFunction(done) {
    bootstrap.cleanUp(workflowName, done);
  });

  it('Task with Hooks', function testFunction(done) {
    expect(taskWithHook).to.exist;
    expect(taskWithHook.dueDate).to.exist;
    let date = new Date(Date.now());
    date = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + processInstance._processVariables.sla));
    expect(taskWithHook.dueDate).to.deep.equal(date);

    taskWithHook.complete({}, bootstrap.defaultContext, function testFunction(err, data) {
      expect(err).to.exist;
      expect(err.message).to.equal('Comments must be provided');
      taskWithHook.complete({
        __comments__: 'ok'
      }, bootstrap.defaultContext, function testFunction(err, data) {
        expect(err).to.not.exist;
        expect(data).to.exist;
        expect(data.comments).to.equal('ok');
        done();
      });
    });
  });

  it('Task with Hooks', function testFunction(done) {
    expect(taskInvalidHook).to.exist;
    expect(taskInvalidHook.dueDate).to.not.exist;
    taskInvalidHook.complete({}, bootstrap.defaultContext, function testFunction(err, data) {
      expect(err).to.not.exist;
      done();
    });
  });

  it('Task with no hook fallsback to defaultHook', function testFunction(done) {
    expect(taskNoHook).to.exist;
    expect(taskNoHook.dueDate).to.exist;
    let date = new Date(Date.now());
    date = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 2));
    expect(taskNoHook.dueDate).to.deep.equal(date);


    bootstrap.onComplete(workflowName, function completionCb(err) {
      done(err);
    });

    taskNoHook.complete({}, bootstrap.defaultContext, function testFunction(err, data) {
      expect(err).to.exist;
      expect(err.message).to.equal('Default: Comments must be provided');
      taskNoHook.complete({
        __comments__: 'ok'
      }, bootstrap.defaultContext, function testFunction(err, data) {
        expect(err).to.not.exist;
        expect(data).to.exist;
        expect(data.comments).to.equal('ok');
      });
    });
  });
});
