/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
/**
 * @description Task Event Handlers
 * @author Mandeep Gill(mandeep6ill), Prem Sai(premsai-ch)
 */

var logger = require('oe-logger');
var log = logger('Task');

var exports = module.exports = {};

exports._taskInterruptHandler = function _taskInterruptHandler(options, Task, currentTask) {
  var version = currentTask._version;
  currentTask.updateAttributes({
    'status': 'interrupted',
    '_version': version
  }, options, function fetchTask(err, utask) {
    /* istanbul ignore if*/
    if (err) {
      return log.error(err);
    }
  });
};
