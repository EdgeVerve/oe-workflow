/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

var bootstrap = require('../bootstrap');
var chai = bootstrap.chai;
var assert = chai.assert;
var models = bootstrap.models;
var log = bootstrap.log();


describe('Test case for Workflow Recovery', function CB() {
  this.timeout(1000000);
  // var name = 'loop-workaround';
  var name = 'workflow-recovery';

  it('should start recovery', function cb(done) {
    // now wait for some time to recover
    setTimeout(done, 10000);
  });

  it('should fetch all 8 complete instance via app', function CB(done) {
    models.ProcessInstance.find({
      where: {
        and: [{
          processDefinitionName: name
        }, {
          _status: 'complete'
        }]
      }
    }, bootstrap.defaultContext, function fetchPendingInstance(err, instances) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(instances);
      assert.strictEqual(instances.length, 8);
      done();
    });
  });
});

