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

describe('User Task UI Tests', function callback() {
  let workflowName = 'user-task-ui';
  let userTask1; let userTask2; let userTask3;
  let processInstance;
  before('define workflow', function testFunction(done) {
    async.parallel([
      function testFunction(cb) {
        bootstrap.onUserTask(workflowName, 'UserTask1', function testFunction(err, task, instance) {
          expect(err).to.not.exist;
          userTask1 = task;
          processInstance = instance;
          cb();
        });
      },
      function testFunction(cb) {
        bootstrap.onUserTask(workflowName, 'UserTask2', function testFunction(err, task) {
          expect(err).to.not.exist;
          userTask2 = task;
          cb();
        });
      },
      function testFunction(cb) {
        bootstrap.onUserTask(workflowName, 'UserTask3', function testFunction(err, task) {
          expect(err).to.not.exist;
          userTask3 = task;
          cb();
        });
      }
    ], function testFunction(err, results) {
      done(err);
    });

    bootstrap.loadAndTrigger(workflowName, { processVariables: { var1: 'val1', age: 28, name: 'Alice', myForm: 'elem:/element/dynamic-form.html' } }, function testFunction(err) {
      expect(err).to.not.exist;
    });
  });

  after('cleanup data', function testFunction(done) {
    bootstrap.cleanUp(workflowName, done);
  });

  it('Task with FormKey', function testFunction(done) {
    expect(userTask1).to.exist;
    expect(userTask1.formType).to.equal('FormKey');
    expect(userTask1.formKey).to.equal('import:/element/task-form.html');
    expect(userTask1.formVariables).to.deep.equal(processInstance._processVariables);
    done();
  });

  it('Task with FormData', function testFunction(done) {
    expect(userTask2).to.exist;
    expect(userTask2.formType).to.equal('FormData');
    expect(userTask2.formKey).to.not.exist;
    expect(userTask2.formVariables).to.exist;
    expect(userTask2.formVariables.name).to.exist.and.have.property('label');
    expect(userTask2.formVariables.name.defaultValue).to.equal('Alice');
    expect(userTask2.formVariables.age).to.exist.and.have.property('label');
    expect(userTask2.formVariables.age.defaultValue).to.equal('28');
    expect(userTask2.formVariables.occupation).to.exist.and.have.property('label');
    expect(userTask2.formVariables.occupation.defaultValue).to.equal('UnEmployed');
    done();
  });

  it('Task with dynamic FormKey', function testFunction(done) {
    expect(userTask3).to.exist;
    expect(userTask3.formType).to.equal('FormKey');
    expect(userTask3.formKey).to.equal('elem:/element/dynamic-form.html');
    expect(userTask3.formVariables).to.deep.equal(processInstance._processVariables);
    done();
  });
});
