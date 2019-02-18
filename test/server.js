var oecloud = require('oe-cloud');

oecloud.observe('loaded', function loadedCb(ctx, next) {
  return next();
});

oecloud.boot(__dirname, function bootCb(err) {
  if (err) {
    throw err;
  }
  oecloud.start();
  oecloud.emit('test-start');
});
