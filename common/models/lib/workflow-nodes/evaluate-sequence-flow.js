/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
/**
 * @description  Sequence Flow Condition Evaluator
 * @author Kangan Verma(kangan06), Mandeep Gill(mandeep6ill), Prem Sai(premsai-ch), Vivek Mittal(vivekmittal07)
 */

var sandbox = require('./sandbox.js');

 /*
  * Evaluates the expression on the outgoing flow
  * @return result of expression
  */
module.exports.evaluate = function evaluateSF(options, flow, message, process) {
  var conditionTrue = false;

  if (flow.script) {
    conditionTrue = sandbox.evaluateExpression(options, flow.script, message, process);
  } else {
    conditionTrue = (message.path === flow.name);
  }
  return conditionTrue;
};
