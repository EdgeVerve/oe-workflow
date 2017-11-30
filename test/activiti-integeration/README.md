## Activiti Server has to be setup before executing Acitiviti Test Cases

#### Sample Test Case snippet to connect and configure **Activiti** : 

``` js
  it('should initiate activiti models dynamically', function cb(done) {
    var ActivitiManager = app.models.Activiti_Manager;
    var url = ACTIVITI_URL_PATH;

    ActivitiManager.enable(url, options, function cb(err, res) {
      if (err) {
        log.error(err);
        done(err);
      }
      log.debug(res);
      done();
    });
  });

  it('should register an activiti account - User', function cb(done) {
    models.Activiti_Account.create({
      'username': USERNAME,
      'password': PASSWORD
    }, options, function cb(err, instance) {
      if (err) {
        log.error(err);
        return done(err);
      }
      log.debug(instance);
      done();
    });
  });

```

> Same can be configured via boot-script.