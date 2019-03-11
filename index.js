var wrapper = require('./lib/wrapper.js');
const commonMixins = require('oe-common-mixins');


commonMixins();
module.exports = function main(app) {
  wrapper(app);
};
