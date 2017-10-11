/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
/**
 * @description  Throw Object
 * @author Kangan Verma(kangan06), Mandeep Gill(mandeep6ill), Prem Sai(premsai-ch), Vivek Mittal(vivekmittal07)
 */

'use strict';

/**
 * @param  {String} type Type
 * @param  {String} id Id
 * @param  {String} msg message
 * @returns {void}
 */
exports.throwObject = function throwObj(type, id, msg) {
  var throwObj = {};
  throwObj.type = type;
  throwObj.id = id || null;
  if (type === 'message') {
    if (msg) {
      if (msg.messageRef) {
        throwObj.id = msg.messageRef;
      }
      if (msg.payload) {
        throwObj.message = msg.payload;
      }
      if (msg.businessKey) {
        throwObj.businessKey = msg.businessKey;
      }
    }
  }
  if (type === 'escalation' || type === 'error') {
    throwObj.code = msg;
  }
  if (type === 'signal') {
    throwObj.attachedTokenId =  ( msg && msg.tokenId ? msg.tokenId : null);
  }
  return throwObj;
};
