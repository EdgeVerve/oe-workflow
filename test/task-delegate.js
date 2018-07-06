var fs = require('fs');
var path = require('path');
var async = require('async');
var chai = require('chai');
var chalk = require('chalk');
var expect = chai.expect;
var bootstrap = require('./bootstrap');
var supertest = require('supertest');
var app = bootstrap.app;
var api = supertest(app);
var basePath = app.get('restApiRoot');
var models = bootstrap.models;

var wf = {};

describe(chalk.blue('Task delegation to a role or user and providing comments'), function cb() {
  this.timeout(10000);
  var BaseUser = models.BaseUser;
  var BaseRole = models.BaseRole;
  var BaseRoleMapping = models.BaseRoleMapping;


  var ctxUser1 = {
    ctx: {
      'tenantId': 'default',
      'remoteUser': 'TestWfUser1',
      'username': 'TestWfUser1',
      'roles': [
        'wfadmin'
      ]
    }
  };
  var ctxUser2 = {
    ctx: {
      'tenantId': 'default',
      'remoteUser': 'TestWfUser2',
      'username': 'TestWfUser2',
      'roles': [
        'wfmanager'
      ]
    }
  };
  var ctxUser3 = {
    ctx: {
      'tenantId': 'default',
      'remoteUser': 'TestWfUser3',
      'username': 'TestWfUser3',
      'roles': [
        'wfmanager'
      ]
    }
  };
  before('creating users and roles', function cb(done) {
    async.series([
      function cb(callback) {
        BaseUser.create({ username: 'TestWfUser1', email: 'TestWfUser1@oe.com', password: 'password', id: 'wfuser1' }, bootstrap.defaultContext, function cb(err, user) {
          if (err) {
            callback(err);
          } else {
            expect(user).not.to.be.null;
            expect(user).not.to.be.empty;
            expect(user).not.to.be.undefined;
            expect(user.username).to.be.equal('TestWfUser1');
            callback();
          }
        });
      },
      function cb(callback) {
        BaseUser.create({ username: 'TestWfUser2', email: 'TestWfUser2@oe.com', password: 'password', id: 'wfuser2' }, bootstrap.defaultContext, function cb(err, user) {
          if (err) {
            callback(err);
          } else {
            expect(user).not.to.be.null;
            expect(user).not.to.be.empty;
            expect(user).not.to.be.undefined;
            expect(user.username).to.be.equal('TestWfUser2');
            callback();
          }
        });
      },
      function cb(callback) {
        BaseUser.create({ username: 'TestWfUser3', email: 'TestWfUser3@oe.com', password: 'password', id: 'wfuser3' }, bootstrap.defaultContext, function cb(err, user) {
          if (err) {
            callback(err);
          } else {
            expect(user).not.to.be.null;
            expect(user).not.to.be.empty;
            expect(user).not.to.be.undefined;
            expect(user.username).to.be.equal('TestWfUser3');
            callback();
          }
        });
      },
      function cb(callback) {
        BaseRole.create({ name: 'wfadmin', id: 'wfadmin' }, bootstrap.defaultContext, function cb(err, role) {
          if (bootstrap.checkDuplicateKeyError(err)) {
            callback();
          } else if (err) {
            return callback(err);
          } else {
            expect(role).not.to.be.null;
            expect(role).not.to.be.empty;
            expect(role).not.to.be.undefined;
            expect(role.name).to.be.equal('wfadmin');
            callback();
          }
        });
      },
      function cb(callback) {
        BaseRole.create({ name: 'wfmanager', id: 'wfmanager' }, bootstrap.defaultContext, function cb(err, role) {
          if (bootstrap.checkDuplicateKeyError(err)) {
            callback();
          } else if (err) {
            return callback(err);
          } else {
            expect(role).not.to.be.null;
            expect(role).not.to.be.empty;
            expect(role).not.to.be.undefined;
            expect(role.name).to.be.equal('wfmanager');
            callback();
          }
        });
      },
      function cb(callback) {
        BaseRoleMapping.create({ principalType: 'USER', principalId: 'wfuser1', roleId: 'wfadmin' }, bootstrap.defaultContext, function cb(err, roleMap) {
          if (err) {
            return callback(err);
          }
          expect(roleMap).not.to.be.null;
          expect(roleMap).not.to.be.empty;
          expect(roleMap).not.to.be.undefined;
          expect(roleMap.principalId).to.be.equal('wfuser1');
          expect(roleMap.roleId).to.be.equal('wfadmin');
          callback();
        });
      },
      function cb(callback) {
        BaseRoleMapping.create({ principalType: 'USER', principalId: 'wfuser2', roleId: 'wfmanager' }, bootstrap.defaultContext, function cb(err, roleMap) {
          if (err) {
            return callback(err);
          }
          expect(roleMap).not.to.be.null;
          expect(roleMap).not.to.be.empty;
          expect(roleMap).not.to.be.undefined;
          expect(roleMap.principalId).to.be.equal('wfuser2');
          expect(roleMap.roleId).to.be.equal('wfmanager');
          callback();
        });
      },
      function cb(callback) {
        BaseRoleMapping.create({ principalType: 'USER', principalId: 'wfuser3', roleId: 'wfmanager' }, bootstrap.defaultContext, function cb(err, roleMap) {
          if (err) {
            return callback(err);
          }
          expect(roleMap).not.to.be.null;
          expect(roleMap).not.to.be.empty;
          expect(roleMap).not.to.be.undefined;
          expect(roleMap.principalId).to.be.equal('wfuser3');
          expect(roleMap.roleId).to.be.equal('wfmanager');
          callback();
        });
      }
    ], function cb(err) {
      if (err) {
        done(err);
      } else {
        done();
      }
    });
  });

  before('creating test workflow', function cb(done) {
    var userTaskWorkflow = 'task-comments';
    async.series([
      function cb(callback) {
        fs.readFile(path.resolve('./test/bpmn-files', userTaskWorkflow + '.bpmn'), 'utf8', (err, data) => {
          wf.xmldata = data;
          callback(err);
        });
      }, function cb(callback) {
        var defData = { 'name': userTaskWorkflow, 'xmldata': wf.xmldata };
        models.WorkflowDefinition.create(defData, bootstrap.defaultContext, function cb(err) {
          if (err) {
            callback(err);
          } else {
            callback();
          }
        });
      }, function cb(callback) {
        var data = { 'workflowDefinitionName': userTaskWorkflow };
        models.WorkflowInstance.create(data, bootstrap.defaultContext, function cb(err, instance) {
          if (err) {
            callback(err);
          } else {
            expect(instance).not.to.be.null;
            expect(instance).not.to.be.empty;
            expect(instance).not.to.be.undefined;
            wf.workflowInstance = instance;
            callback();
          }
        });
      }, function cb(callback) {
        wf.workflowInstance.processes({}, bootstrap.defaultContext, function cb(err, proc) {
          if (err) {
            return callback(err);
          }
          expect(proc).not.to.be.null;
          expect(proc).not.to.be.empty;
          expect(proc).not.to.be.undefined;
          wf.processes = proc;
          setTimeout(callback, 3000);
        });
      }
    ], function cb(err) {
      if (err) {
        done(err);
      } else {
        done();
      }
    });
  });

  // after('cleanup', function cb(done) {

  // });

  it('Test to Update the comments of the task', function cb(done) {
    wf.processes[0].tasks({}, ctxUser3, function callback(err, task) {
      if (err) {
        done(err);
      } else {
        expect(task).not.to.be.null;
        expect(task).not.to.be.empty;
        expect(task).not.to.be.undefined;
        task[0].updateComments('Test comments', ctxUser3, function cb(err, updatedTask) {
          if (err) {
            done(err);
          } else {
            expect(updatedTask).not.to.be.null;
            expect(updatedTask).not.to.be.empty;
            expect(updatedTask).not.to.be.undefined;
            expect(updatedTask.comments).to.be.equal('Test comments');
            done();
          }
        });
      }
    });
  });

  it('Test to delegate the task to different user with comments', function cb(done) {
    wf.processes[0].tasks({}, ctxUser3, function callback(err, task) {
      if (err) {
        done(err);
      } else {
        task[0].delegate({ assignee: ctxUser1.ctx.username, comments: 'Delegated task to adminUser' }, ctxUser3, function cb(err, updatedTask) {
          if (err) {
            done(err);
          } else {
            expect(updatedTask).not.to.be.null;
            expect(updatedTask).not.to.be.empty;
            expect(updatedTask).not.to.be.undefined;
            expect(updatedTask.comments).to.be.equal('Delegated task to adminUser');
            wf.processes[0].tasks({}, ctxUser3, function callback(err, task) {
              if (err) {
                done(err);
              } else {
                expect(task).not.to.be.null;
                expect(task).not.to.be.undefined;
                expect(task.length).to.be.equal(0);
                wf.processes[0].tasks({}, ctxUser1, function callback(err, task) {
                  if (err) {
                    done(err);
                  } else {
                    expect(task).not.to.be.null;
                    expect(task).not.to.be.empty;
                    expect(task).not.to.be.undefined;
                    expect(task[0].comments).to.be.equal('Delegated task to adminUser');
                    done();
                  }
                });
              }
            });
          }
        });
      }
    });
  });

  it('Test to delegate the task to different role with comments', function cb(done) {
    wf.processes[0].tasks({}, ctxUser1, function callback(err, task) {
      if (err) {
        done(err);
      } else {
        task[0].delegate({ role: ctxUser2.ctx.roles[0], comments: 'Delegated task to role wfmanager' }, ctxUser3, function cb(err, updatedTask) {
          if (err) {
            done(err);
          } else {
            expect(updatedTask).not.to.be.null;
            expect(updatedTask).not.to.be.empty;
            expect(updatedTask).not.to.be.undefined;
            expect(updatedTask.comments).to.be.equal('Delegated task to role wfmanager');
            wf.processes[0].tasks({}, ctxUser2, function callback(err, task) {
              if (err) {
                done(err);
              } else {
                expect(task).not.to.be.null;
                expect(task).not.to.be.empty;
                expect(task).not.to.be.undefined;
                expect(task[0].comments).to.be.equal('Delegated task to role wfmanager');
                wf.processes[0].tasks({}, ctxUser3, function callback(err, task) {
                  if (err) {
                    done(err);
                  } else {
                    expect(task).not.to.be.null;
                    expect(task).not.to.be.empty;
                    expect(task).not.to.be.undefined;
                    expect(task[0].comments).to.be.equal('Delegated task to role wfmanager');
                    done();
                  }
                });
              }
            });
          }
        });
      }
    });
  });
});

describe(chalk.blue('Task delegation to a role or user and providing comments'), function cb() {
  var atUser1;
  var atUser2;
  var atUser3;
  var taskId;
  var ctxUser1 = {
    ctx: {
      'tenantId': 'default',
      'remoteUser': 'TestWfUser1',
      'username': 'TestWfUser1',
      'roles': [
        'wfadmin'
      ]
    }
  };
  var ctxUser2 = {
    ctx: {
      'tenantId': 'default',
      'remoteUser': 'TestWfUser2',
      'username': 'TestWfUser2',
      'roles': [
        'wfmanager'
      ]
    }
  };
  var ctxUser3 = {
    ctx: {
      'tenantId': 'default',
      'remoteUser': 'TestWfUser3',
      'username': 'TestWfUser3',
      'roles': [
        'wfmanager'
      ]
    }
  };
  before('User login', function cb(done) {
    var url = basePath + '/BaseUsers/login';
    async.series([function cb(callback) {
      var user = {
        username: 'TestWfUser1',
        password: 'password'
      };
      api
        .post(url)
        .send(user)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .end(function cb(err, response) {
          if (err) {
            callback(err);
          } else {
            expect(response.body.id).to.be.defined;
            atUser1 = response.body.id;
            callback();
          }
        });
    }, function cb(callback) {
      var user = {
        username: 'TestWfUser2',
        password: 'password'
      };
      api
        .post(url)
        .send(user)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .end(function cb(err, response) {
          if (err) {
            callback(err);
          } else {
            expect(response.body.id).to.be.defined;
            atUser2 = response.body.id;
            callback();
          }
        });
    }, function cb(callback) {
      var user = {
        username: 'TestWfUser3',
        password: 'password'
      };
      api
        .post(url)
        .send(user)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .end(function cb(err, response) {
          if (err) {
            callback(err);
          } else {
            expect(response.body.id).to.be.defined;
            atUser3 = response.body.id;
            callback();
          }
        });
    }], function cb(err) {
      if (err) {
        done(err);
      } else {
        done();
      }
    });
  });

  it('Test to Update the comments of the task', function cb(done) {
    wf.processes[0].tasks({}, ctxUser3, function callback(err, task) {
      if (err) {
        done(err);
      } else {
        expect(task).not.to.be.null;
        expect(task).not.to.be.empty;
        expect(task).not.to.be.undefined;
        var comments = 'updating comments through api';
        taskId = task[0].id;
        var url = basePath + '/Tasks/' + taskId + '/comments/' + comments + '?access_token=' + atUser3;
        api
          .put(url)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json')
          .expect(200)
          .end(function cb(err, response) {
            if (err) {
              done(err);
            } else {
              expect(response.body).to.be.defined;
              expect(response.body.comments).to.be.equal('updating comments through api');
              done();
            }
          });
      }
    });
  });

  it('Test to delegate the task to different user with comments', function cb(done) {
    var comments = 'delegating through api with comments';
    var url = basePath + '/Tasks/' + taskId + '/delegate?access_token=' + atUser3;
    var postData = {
      assignee: ctxUser1.ctx.username,
      comments: comments
    };
    api
      .put(url)
      .send(postData)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .expect(200)
      .end(function cb(err, response) {
        if (err) {
          done(err);
        } else {
          expect(response.body).to.be.defined;
          expect(response.body.comments).to.be.equal('delegating through api with comments');
          done();
        }
      });
  });

  it('Test to delegate the task to different role with comments', function cb(done) {
    var comments = 'delegating to different role through api with comments';
    var url = basePath + '/Tasks/' + taskId + '/delegate?access_token=' + atUser1;
    var postData = {
      role: ctxUser2.ctx.roles[0],
      comments: comments
    };
    api
      .put(url)
      .send(postData)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .expect(200)
      .end(function cb(err, response) {
        if (err) {
          done(err);
        } else {
          expect(response.body).to.be.defined;
          expect(response.body.comments).to.be.equal('delegating to different role through api with comments');

          var url = basePath + '/Tasks' + '?access_token=' + atUser2 + '&filter={"where":{"id":"' + taskId + '"}}';
          api
            .get(url)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
            .expect(200)
            .end(function cb(err, response) {
              if (err) {
                done(err);
              } else {
                expect(response.body).to.be.defined;
                expect(response.body[0].comments).to.be.equal('delegating to different role through api with comments');

                var url = basePath + '/Tasks' + '?access_token=' + atUser3 + '&filter={"where":{"id":"' + taskId + '"}}';
                api
                  .get(url)
                  .set('Content-Type', 'application/json')
                  .set('Accept', 'application/json')
                  .expect(200)
                  .end(function cb(err, response) {
                    if (err) {
                      done(err);
                    } else {
                      expect(response.body).to.be.defined;
                      expect(response.body[0].comments).to.be.equal('delegating to different role through api with comments');
                      done();
                    }
                  });
              }
            });
        }
      });
  });
});
