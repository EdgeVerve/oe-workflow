/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

var path = require('path');
var loopback = require('loopback');
var app = loopback();
var oeapp = require('oe-cloud');
var options = oeapp.options;

module.exports = app;
// apphome is used by oe-foundation to know application server directory
// as of now it used for picking providers.json
app.locals.apphome = __dirname;

app.use('/bower_components',  loopback.static(path.join(__dirname, 'bower_components')));

options.bootDirs.push(path.join(__dirname, 'boot'));
options.clientAppRootDir = __dirname;
oeapp.boot(app, options, function bootCb() {
  app.start();
  app.emit('WFStarted');
});
