/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
var bootstrap = require('./bootstrap');
var chai = bootstrap.chai;
var assert = chai.assert;
chai.use(require('chai-datetime'));
var appRoot = require('app-root-path');
var OEUtils = appRoot.require('/common/models/lib/utils/oe-date-utils.js');


describe('Test case for date utils', function callback() {
  this.timeout(10000);
  /* eslint-disable */
  var undefVal = undefined;
  /* eslint-enable */
  it('should return undefVal when the date is not valid', function cb(done) {
    assert.equal(undefVal, OEUtils.DateUtils.parse('0-01-2014', 'UK'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('0-01-2014', 'UK'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('05-0-14', 'UK'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('1-13-15', 'UK'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('31-2-98', 'UK'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('32-13-2015', 'UK'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('31-4-2015', 'UK'));
    done();
  });
  it('should return the actual date when the date is valid', function cb(done) {
    assert.equalDate(OEUtils.DateUtils.parse('10-01-2014', 'UK'), new Date(
      '2014/1/10'));
    assert.equalDate(OEUtils.DateUtils.parse('10-01-14', 'UK'), new Date('2014/1/10'));
    assert.equalDate(OEUtils.DateUtils.parse('10-10-2014', 'UK'), new Date(
      '2014/10/10'));
    assert.equalDate(OEUtils.DateUtils.parse('10-2-2014', 'UK'), new Date('2014/2/10'));
    assert.equalDate(OEUtils.DateUtils.parse('29-2-2016', 'UK'), new Date('2016/2/29'));
    assert.equalDate(OEUtils.DateUtils.parse('29-2-16', 'UK'), new Date('2016/2/29'));
    assert.equalDate(OEUtils.DateUtils.parse('29-2-00', 'UK'), new Date('2000/2/29'));
    assert.equalDate(OEUtils.DateUtils.parse('29-2-96', 'UK'), new Date('1996/2/29'));
    done();
  });
  it('should return undefVal when the date is not valid', function cb(done) {
    assert.equal(undefVal, OEUtils.DateUtils.parse('0,01,2014', 'UK'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('05,0,14', 'UK'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('1,13,15', 'UK'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('31,2,98', 'UK'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('32,13,2015', 'UK'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('31,4,2015', 'UK'));
    done();
  });
  it('should return the actual date when the date is valid', function cb(done) {
    assert.equalDate(OEUtils.DateUtils.parse('10,01,2014', 'UK'), new Date(
      '2014/1/10'));
    assert.equalDate(OEUtils.DateUtils.parse('10,01,14', 'UK'), new Date('2014/1/10'));
    assert.equalDate(OEUtils.DateUtils.parse('10,10,2014', 'UK'), new Date(
      '2014/10/10'));
    assert.equalDate(OEUtils.DateUtils.parse('10,2,2014', 'UK'), new Date('2014/2/10'));
    assert.equalDate(OEUtils.DateUtils.parse('29,2,2016', 'UK'), new Date('2016/2/29'));
    assert.equalDate(OEUtils.DateUtils.parse('29,2,16', 'UK'), new Date('2016/2/29'));
    assert.equalDate(OEUtils.DateUtils.parse('29,2,00', 'UK'), new Date('2000/2/29'));
    assert.equalDate(OEUtils.DateUtils.parse('29,2,96', 'UK'), new Date('1996/2/29'));
    done();
  });
  it('should return undefVal when the date is not valid', function cb(done) {
    assert.equal(undefVal, OEUtils.DateUtils.parse('0=01=2014', 'UK'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('05=0=14', 'UK'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('1=13=15', 'UK'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('31=2=98', 'UK'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('32=13=2015', 'UK'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('31=4=2015', 'UK'));
    done();
  });
  it('should return the actual date when the date is valid', function cb(done) {
    assert.equalDate(OEUtils.DateUtils.parse('10=01=2014', 'UK'), new Date(
      '2014/1/10'));
    assert.equalDate(OEUtils.DateUtils.parse('10=01=14', 'UK'), new Date('2014/1/10'));
    assert.equalDate(OEUtils.DateUtils.parse('10=10=2014', 'UK'), new Date(
      '2014/10/10'));
    assert.equalDate(OEUtils.DateUtils.parse('10=2=2014', 'UK'), new Date('2014/2/10'));
    assert.equalDate(OEUtils.DateUtils.parse('29=2=2016', 'UK'), new Date('2016/2/29'));
    assert.equalDate(OEUtils.DateUtils.parse('29=2=16', 'UK'), new Date('2016/2/29'));
    assert.equalDate(OEUtils.DateUtils.parse('29=2=00', 'UK'), new Date('2000/2/29'));
    assert.equalDate(OEUtils.DateUtils.parse('29=2=96', 'UK'), new Date('1996/2/29'));
    done();
  });
  it('should return undefVal when the date is not valid', function cb(done) {
    assert.equal(undefVal, OEUtils.DateUtils.parse('0/01/2014', 'UK'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('05/0/14', 'UK'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('1/13/15', 'UK'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('31/2/98', 'UK'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('32/13/2015', 'UK'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('31/4/2015', 'UK'));
    done();
  });
  it('should return the actual date when the date is valid', function cb(done) {
    assert.equalDate(OEUtils.DateUtils.parse('10/01/2014', 'UK'), new Date(
      '2014/1/10'));
    assert.equalDate(OEUtils.DateUtils.parse('10/01/14', 'UK'), new Date('2014/1/10'));
    assert.equalDate(OEUtils.DateUtils.parse('10/10/2014', 'UK'), new Date(
      '2014/10/10'));
    assert.equalDate(OEUtils.DateUtils.parse('10/2/2014', 'UK'), new Date('2014/2/10'));
    assert.equalDate(OEUtils.DateUtils.parse('29/2/2016', 'UK'), new Date('2016/2/29'));
    assert.equalDate(OEUtils.DateUtils.parse('29/2/16', 'UK'), new Date('2016/2/29'));
    assert.equalDate(OEUtils.DateUtils.parse('29/2/00', 'UK'), new Date('2000/2/29'));
    assert.equalDate(OEUtils.DateUtils.parse('29/2/96', 'UK'), new Date('1996/2/29'));
    done();
  });
  it('should return undefVal when the date is not valid', function cb(done) {
    assert.equal(undefVal, OEUtils.DateUtils.parse('0 01 2014', 'UK'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('05 0 14', 'UK'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('1 13 15', 'UK'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('31 2 98', 'UK'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('32 13 2015', 'UK'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('31 4 2015', 'UK'));
    done();
  });
  it('should return the actual date when the date is valid', function cb(done) {
    assert.equalDate(OEUtils.DateUtils.parse('10 01 2014', 'UK'), new Date(
      '2014/1/10'));
    assert.equalDate(OEUtils.DateUtils.parse('10 01 14', 'UK'), new Date('2014/1/10'));
    assert.equalDate(OEUtils.DateUtils.parse('10 10 2014', 'UK'), new Date(
      '2014/10/10'));
    assert.equalDate(OEUtils.DateUtils.parse('10 2 2014', 'UK'), new Date('2014/2/10'));
    assert.equalDate(OEUtils.DateUtils.parse('29 2 2016', 'UK'), new Date('2016/2/29'));
    assert.equalDate(OEUtils.DateUtils.parse('29 2 16', 'UK'), new Date('2016/2/29'));
    assert.equalDate(OEUtils.DateUtils.parse('29 2 00', 'UK'), new Date('2000/2/29'));
    assert.equalDate(OEUtils.DateUtils.parse('29 2 96', 'UK'), new Date('1996/2/29'));
    done();
  });
  it('should return undefVal when the date is not valid', function cb(done) {
    assert.equal(undefVal, OEUtils.DateUtils.parse('0:01:2014', 'UK'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('05:0:14', 'UK'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('1:13:15', 'UK'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('31:2:98', 'UK'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('32:13:2015', 'UK'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('31:4:2015', 'UK'));
    done();
  });
  it('should return the actual date when the date is valid', function cb(done) {
    assert.equalDate(OEUtils.DateUtils.parse('10:01:2014', 'UK'), new Date(
      '2014/1/10'));
    assert.equalDate(OEUtils.DateUtils.parse('10:01:14', 'UK'), new Date('2014/1/10'));
    assert.equalDate(OEUtils.DateUtils.parse('10:10:2014', 'UK'), new Date(
      '2014/10/10'));
    assert.equalDate(OEUtils.DateUtils.parse('10:2:2014', 'UK'), new Date('2014/2/10'));
    assert.equalDate(OEUtils.DateUtils.parse('29:2:2016', 'UK'), new Date('2016/2/29'));
    assert.equalDate(OEUtils.DateUtils.parse('29:2:16', 'UK'), new Date('2016/2/29'));
    assert.equalDate(OEUtils.DateUtils.parse('29:2:00', 'UK'), new Date('2000/2/29'));
    assert.equalDate(OEUtils.DateUtils.parse('29:2:96', 'UK'), new Date('1996/2/29'));
    done();
  });
  it('should return undefVal when the date is not valid', function cb(done) {
    assert.equal(undefVal, OEUtils.DateUtils.parse('2014:0:01', 'UK'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('2019:05:0', 'UK'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('2034:13:13', 'UK'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('1998:31:2', 'UK'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('2018:32:13', 'UK'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('2018:31:4', 'UK'));
    done();
  });
  it('should return the actual date when the date is valid', function cb(done) {
    assert.equalDate(OEUtils.DateUtils.parse('2014:10:01', 'UK'), new Date(
      '2014/10/1'));
    assert.equalDate(OEUtils.DateUtils.parse('2014:10:9', 'UK'), new Date('2014/10/9'));
    assert.equalDate(OEUtils.DateUtils.parse('2014:10:2', 'UK'), new Date('2014/10/2'));
    assert.equalDate(OEUtils.DateUtils.parse('2016:2:29', 'UK'), new Date('2016/2/29'));
    done();
  });
  it('should return undefVal when the date is not valid', function cb(done) {
    assert.equal(undefVal, OEUtils.DateUtils.parse('0-01/2014', 'UK'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('05-0,14', 'UK'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('1,13-15', 'UK'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('31/2 98', 'UK'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('32=13:2015', 'UK'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('31,4:2015', 'UK'));
    done();
  });
  it('should return the actual date when the date is valid', function cb(done) {
    assert.equalDate(OEUtils.DateUtils.parse('10/01-2014', 'UK'), new Date(
      '2014/1/10'));
    assert.equalDate(OEUtils.DateUtils.parse('10,01/14', 'UK'), new Date('2014/1/10'));
    assert.equalDate(OEUtils.DateUtils.parse('10.10=2014', 'UK'), new Date(
      '2014/10/10'));
    assert.equalDate(OEUtils.DateUtils.parse('10 2:2014', 'UK'), new Date('2014/2/10'));
    assert.equalDate(OEUtils.DateUtils.parse('29.2,2016', 'UK'), new Date('2016/2/29'));
    assert.equalDate(OEUtils.DateUtils.parse('29,2/16', 'UK'), new Date('2016/2/29'));
    assert.equalDate(OEUtils.DateUtils.parse('29=2.00', 'UK'), new Date('2000/2/29'));
    assert.equalDate(OEUtils.DateUtils.parse('29 2/96', 'UK'), new Date('1996/2/29'));
    done();
  });
  it('should return undefVal when the date is not valid', function cb(done) {
    assert.equal(undefVal, OEUtils.DateUtils.parse('0*01*2014', 'UK', '*'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('05+0+14', 'UK', '+'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('1\\13\\15', 'UK', '\\'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('31@2@98', 'UK', '@'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('32-13%2015', 'UK', '%'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('31-4*2015', 'UK', '*'));
    done();
  });
  it('should return the actual date when the date is valid', function cb(done) {
    assert.equalDate(OEUtils.DateUtils.parse('10*01*2014', 'UK', '*'), new Date(
      '2014/1/10'));
    assert.equalDate(OEUtils.DateUtils.parse('10\\01\\14', 'UK', '\\'), new Date(
      '2014/1/10'));
    assert.equalDate(OEUtils.DateUtils.parse('10&10&2014', 'UK', '&'), new Date(
      '2014/10/10'));
    assert.equalDate(OEUtils.DateUtils.parse('10@2@2014', 'UK', '@'), new Date(
      '2014/2/10'));
    assert.equalDate(OEUtils.DateUtils.parse('29-2\\2016', 'UK', '\\'), new Date(
      '2016/2/29'));
    assert.equalDate(OEUtils.DateUtils.parse('29@2-16', 'UK', '@'), new Date(
      '2016/2/29'));
    assert.equalDate(OEUtils.DateUtils.parse('29 2@00', 'UK', '@'), new Date(
      '2000/2/29'));
    assert.equalDate(OEUtils.DateUtils.parse('29-2&96', 'UK', '&'), new Date(
      '1996/2/29'));
    done();
  });
  it('should return undefVal when the date is not valid', function cb(done) {
    assert.equal(undefVal, OEUtils.DateUtils.parse('0014', 'UK'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('1012', 'UK'));
    done();
  });
  it('should return the actual date when the date is valid', function cb(done) {
    assert.equalDate(OEUtils.DateUtils.parse('2398', 'UK'), new Date('1998/3/2'));
    assert.equalDate(OEUtils.DateUtils.parse('1345', 'UK'), new Date('2045/3/1'));
    assert.equalDate(OEUtils.DateUtils.parse('3478', 'UK'), new Date('1978/4/3'));
    assert.equalDate(OEUtils.DateUtils.parse('1390', 'UK'), new Date('1990/3/1'));
    assert.equalDate(OEUtils.DateUtils.parse('7698', 'UK'), new Date('1998/6/7'));
    assert.equalDate(OEUtils.DateUtils.parse('3456', 'UK'), new Date('2056/4/3'));
    assert.equalDate(OEUtils.DateUtils.parse('2345', 'UK'), new Date('2045/3/2'));
    assert.equalDate(OEUtils.DateUtils.parse('7890', 'UK'), new Date('1990/8/7'));
    done();
  });
  it('should return undefVal when the date is not valid or ambiguous', function cb(done) {
    assert.equal(undefVal, OEUtils.DateUtils.parse('00014', 'UK'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('10012', 'UK'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('01012', 'UK'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('21112', 'UK'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('31212', 'UK'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('11112', 'UK'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('11212', 'UK'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('21212', 'UK'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('21212', 'UK'));
    done();
  });
  it('should return the actual date when the date is valid', function cb(done) {
    assert.equalDate(OEUtils.DateUtils.parse('41012', 'UK'), new Date('2012/10/4'));
    assert.equalDate(OEUtils.DateUtils.parse('31314', 'UK'), new Date('2014/3/31'));
    assert.equalDate(OEUtils.DateUtils.parse('71215', 'UK'), new Date('2015/12/7'));
    assert.equalDate(OEUtils.DateUtils.parse('29216', 'UK'), new Date('2016/2/29'));
    assert.equalDate(OEUtils.DateUtils.parse('11398', 'UK'), new Date('1998/3/11'));
    assert.equalDate(OEUtils.DateUtils.parse('51113', 'UK'), new Date('2013/11/5'));
    done();
  });
  it('should return undefVal when the date is not valid or ambiguous', function cb(done) {
    assert.equal(undefVal, OEUtils.DateUtils.parse('000012', 'UK'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('120013', 'UK'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('121314', 'UK'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('321214', 'UK'));
    done();
  });
  it('should return the actual date when the date is valid', function cb(done) {
    assert.equalDate(OEUtils.DateUtils.parse('041010', 'UK'), new Date('2010/10/4'));
    assert.equalDate(OEUtils.DateUtils.parse('310398', 'UK'), new Date('1998/3/31'));
    assert.equalDate(OEUtils.DateUtils.parse('071215', 'UK'), new Date('2015/12/7'));
    assert.equalDate(OEUtils.DateUtils.parse('290216', 'UK'), new Date('2016/2/29'));
    assert.equalDate(OEUtils.DateUtils.parse('110398', 'UK'), new Date('1998/3/11'));
    assert.equalDate(OEUtils.DateUtils.parse('051113', 'UK'), new Date('2013/11/5'));
    done();
  });
  it('should return undefVal when the date is not valid or ambiguous', function cb(done) {
    assert.equal(undefVal, OEUtils.DateUtils.parse('0002016', 'UK'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('1002013', 'UK'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('2112019', 'UK'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('3121998', 'UK'));
    done();
  });
  it('should return the actual date when the date is valid', function cb(done) {
    assert.equalDate(OEUtils.DateUtils.parse('4102010', 'UK'), new Date('2010/10/4'));
    assert.equalDate(OEUtils.DateUtils.parse('3131998', 'UK'), new Date('1998/3/31'));
    assert.equalDate(OEUtils.DateUtils.parse('7122015', 'UK'), new Date('2015/12/7'));
    assert.equalDate(OEUtils.DateUtils.parse('2922016', 'UK'), new Date('2016/2/29'));
    assert.equalDate(OEUtils.DateUtils.parse('1131998', 'UK'), new Date('1998/3/11'));
    assert.equalDate(OEUtils.DateUtils.parse('5112013', 'UK'), new Date('2013/11/5'));
    done();
  });
  it('should return undefVal when the date is not valid or ambiguous', function cb(done) {
    assert.equal(undefVal, OEUtils.DateUtils.parse('00002016', 'UK'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('10002013', 'UK'));
    done();
  });
  it('should return the actual date when the date is valid', function cb(done) {
    assert.equalDate(OEUtils.DateUtils.parse('04102010', 'UK'), new Date('2010/10/4'));
    assert.equalDate(OEUtils.DateUtils.parse('31031998', 'UK'), new Date('1998/3/31'));
    assert.equalDate(OEUtils.DateUtils.parse('07122015', 'UK'), new Date('2015/12/7'));
    assert.equalDate(OEUtils.DateUtils.parse('29022016', 'UK'), new Date('2016/2/29'));
    assert.equalDate(OEUtils.DateUtils.parse('11031998', 'UK'), new Date('1998/3/11'));
    assert.equalDate(OEUtils.DateUtils.parse('05112013', 'UK'), new Date('2013/11/5'));
    done();
  });
  it('should return undefVal when the date is not valid', function cb(done) {
    assert.equal(undefVal, OEUtils.DateUtils.parse('0-01-2014', 'US'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('05-0-14', 'US'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('13-1-15', 'US'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('1-32-98', 'US'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('16-35-2015', 'US'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('4-31-2015', 'US'));
    done();
  });
  it('should return the actual date when the date is valid', function cb(done) {
    assert.equalDate(OEUtils.DateUtils.parse('10-01-2014', 'US'), new Date(
      '2014/10/1'));
    assert.equalDate(OEUtils.DateUtils.parse('10-01-14', 'US'), new Date('2014/10/1'));
    assert.equalDate(OEUtils.DateUtils.parse('10-10-2014', 'US'), new Date(
      '2014/10/10'));
    assert.equalDate(OEUtils.DateUtils.parse('10-2-2014', 'US'), new Date('2014/10/2'));
    assert.equalDate(OEUtils.DateUtils.parse('2-29-2016', 'US'), new Date('2016/2/29'));
    assert.equalDate(OEUtils.DateUtils.parse('2-29-16', 'US'), new Date('2016/2/29'));
    assert.equalDate(OEUtils.DateUtils.parse('2-29-00', 'US'), new Date('2000/2/29'));
    assert.equalDate(OEUtils.DateUtils.parse('2-29-96', 'US'), new Date('1996/2/29'));
    done();
  });
  it('should return undefVal when the date is not valid', function cb(done) {
    assert.equal(undefVal, OEUtils.DateUtils.parse('0,01,2014', 'US'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('05,0,14', 'US'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('13,1,15', 'US'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('1,32,98', 'US'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('16,35,2015', 'US'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('4,31,2015', 'US'));
    done();
  });
  it('should return the actual date when the date is valid', function cb(done) {
    assert.equalDate(OEUtils.DateUtils.parse('10,01,2014', 'US'), new Date(
      '2014/10/1'));
    assert.equalDate(OEUtils.DateUtils.parse('10,01,14', 'US'), new Date('2014/10/1'));
    assert.equalDate(OEUtils.DateUtils.parse('10,10,2014', 'US'), new Date(
      '2014/10/10'));
    assert.equalDate(OEUtils.DateUtils.parse('10,2,2014', 'US'), new Date('2014/10/2'));
    assert.equalDate(OEUtils.DateUtils.parse('2,29,2016', 'US'), new Date('2016/2/29'));
    assert.equalDate(OEUtils.DateUtils.parse('2,29,16', 'US'), new Date('2016/2/29'));
    assert.equalDate(OEUtils.DateUtils.parse('2,29,00', 'US'), new Date('2000/2/29'));
    assert.equalDate(OEUtils.DateUtils.parse('2,29,96', 'US'), new Date('1996/2/29'));
    done();
  });
  it('should return undefVal when the date is not valid', function cb(done) {
    assert.equal(undefVal, OEUtils.DateUtils.parse('0=01=2014', 'US'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('05=0=14', 'US'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('13=1=15', 'US'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('1=32=98', 'US'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('16=35=2015', 'US'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('4=31=2015', 'US'));
    done();
  });
  it('should return the actual date when the date is valid', function cb(done) {
    assert.equalDate(OEUtils.DateUtils.parse('10=01=2014', 'US'), new Date(
      '2014/10/1'));
    assert.equalDate(OEUtils.DateUtils.parse('10=01=14', 'US'), new Date('2014/10/1'));
    assert.equalDate(OEUtils.DateUtils.parse('10=10=2014', 'US'), new Date(
      '2014/10/10'));
    assert.equalDate(OEUtils.DateUtils.parse('10=2=2014', 'US'), new Date('2014/10/2'));
    assert.equalDate(OEUtils.DateUtils.parse('2=29=2016', 'US'), new Date('2016/2/29'));
    assert.equalDate(OEUtils.DateUtils.parse('2=29=16', 'US'), new Date('2016/2/29'));
    assert.equalDate(OEUtils.DateUtils.parse('2=29=00', 'US'), new Date('2000/2/29'));
    assert.equalDate(OEUtils.DateUtils.parse('2=29=96', 'US'), new Date('1996/2/29'));
    done();
  });
  it('should return undefVal when the date is not valid', function cb(done) {
    assert.equal(undefVal, OEUtils.DateUtils.parse('0/01/2014', 'US'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('05/0/14', 'US'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('13/1/15', 'US'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('1/32/98', 'US'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('16/35/2015', 'US'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('4/31/2015', 'US'));
    done();
  });
  it('should return the actual date when the date is valid', function cb(done) {
    assert.equalDate(OEUtils.DateUtils.parse('10/01/2014', 'US'), new Date(
      '2014/10/1'));
    assert.equalDate(OEUtils.DateUtils.parse('10/01/14', 'US'), new Date('2014/10/1'));
    assert.equalDate(OEUtils.DateUtils.parse('10/10/2014', 'US'), new Date(
      '2014/10/10'));
    assert.equalDate(OEUtils.DateUtils.parse('10/2/2014', 'US'), new Date('2014/10/2'));
    assert.equalDate(OEUtils.DateUtils.parse('2/29/2016', 'US'), new Date('2016/2/29'));
    assert.equalDate(OEUtils.DateUtils.parse('2/29/16', 'US'), new Date('2016/2/29'));
    assert.equalDate(OEUtils.DateUtils.parse('2/29/00', 'US'), new Date('2000/2/29'));
    assert.equalDate(OEUtils.DateUtils.parse('2/29/96', 'US'), new Date('1996/2/29'));
    done();
  });
  it('should return undefVal when the date is not valid', function cb(done) {
    assert.equal(undefVal, OEUtils.DateUtils.parse('0 01 2014', 'US'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('05 0 14', 'US'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('13 1 15', 'US'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('1 32 98', 'US'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('16 35 2015', 'US'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('4 31 2015', 'US'));
    done();
  });
  it('should return the actual date when the date is valid', function cb(done) {
    assert.equalDate(OEUtils.DateUtils.parse('10 01 2014', 'US'), new Date(
      '2014/10/1'));
    assert.equalDate(OEUtils.DateUtils.parse('10 01 14', 'US'), new Date('2014/10/1'));
    assert.equalDate(OEUtils.DateUtils.parse('10 10 2014', 'US'), new Date(
      '2014/10/10'));
    assert.equalDate(OEUtils.DateUtils.parse('10 2 2014', 'US'), new Date('2014/10/2'));
    assert.equalDate(OEUtils.DateUtils.parse('2 29 2016', 'US'), new Date('2016/2/29'));
    assert.equalDate(OEUtils.DateUtils.parse('2 29 16', 'US'), new Date('2016/2/29'));
    assert.equalDate(OEUtils.DateUtils.parse('2 29 00', 'US'), new Date('2000/2/29'));
    assert.equalDate(OEUtils.DateUtils.parse('2 29 96', 'US'), new Date('1996/2/29'));
    done();
  });
  it('should return undefVal when the date is not valid', function cb(done) {
    assert.equal(undefVal, OEUtils.DateUtils.parse('0:01:2014', 'US'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('05:0:14', 'US'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('13:1:15', 'US'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('1:32:98', 'US'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('16:35:2015', 'US'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('4:31:2015', 'US'));
    done();
  });
  it('should return the actual date when the date is valid', function cb(done) {
    assert.equalDate(OEUtils.DateUtils.parse('10:01:2014', 'US'), new Date(
      '2014/10/1'));
    assert.equalDate(OEUtils.DateUtils.parse('10:01:14', 'US'), new Date('2014/10/1'));
    assert.equalDate(OEUtils.DateUtils.parse('10:10:2014', 'US'), new Date(
      '2014/10/10'));
    assert.equalDate(OEUtils.DateUtils.parse('10:2:2014', 'US'), new Date('2014/10/2'));
    assert.equalDate(OEUtils.DateUtils.parse('2:29:2016', 'US'), new Date('2016/2/29'));
    assert.equalDate(OEUtils.DateUtils.parse('2:29:16', 'US'), new Date('2016/2/29'));
    assert.equalDate(OEUtils.DateUtils.parse('2:29:00', 'US'), new Date('2000/2/29'));
    assert.equalDate(OEUtils.DateUtils.parse('2:29:96', 'US'), new Date('1996/2/29'));
    done();
  });
  it('should return undefVal when the date is not valid', function cb(done) {
    assert.equal(undefVal, OEUtils.DateUtils.parse('2014:0:01', 'US'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('2019:05:0', 'US'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('2034:32:11', 'US'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('1998:12:14', 'US'));
    done();
  });
  it('should return the actual date when the date is valid', function cb(done) {
    assert.equalDate(OEUtils.DateUtils.parse('2014:10:01', 'US'), new Date(
      '2014/1/10'));
    assert.equalDate(OEUtils.DateUtils.parse('2014:10:9', 'US'), new Date('2014/9/10'));
    assert.equalDate(OEUtils.DateUtils.parse('2014:11:2', 'US'), new Date('2014/2/11'));
    assert.equalDate(OEUtils.DateUtils.parse('2016:29:2', 'US'), new Date('2016/2/29'));
    done();
  });
  it('should return undefVal when the date is not valid', function cb(done) {
    assert.equal(undefVal, OEUtils.DateUtils.parse('0-01/2014', 'US'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('05-0:14', 'US'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('13/1-15', 'US'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('1:32:98', 'US'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('16-35/2015', 'US'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('4,31 2015', 'US'));
    done();
  });
  it('should return the actual date when the date is valid', function cb(done) {
    assert.equalDate(OEUtils.DateUtils.parse('10/01,2014', 'US'), new Date(
      '2014/10/1'));
    assert.equalDate(OEUtils.DateUtils.parse('10.01 14', 'US'), new Date('2014/10/1'));
    assert.equalDate(OEUtils.DateUtils.parse('10 10/2014', 'US'), new Date(
      '2014/10/10'));
    assert.equalDate(OEUtils.DateUtils.parse('10,2.2014', 'US'), new Date('2014/10/2'));
    assert.equalDate(OEUtils.DateUtils.parse('2:29:2016', 'US'), new Date('2016/2/29'));
    assert.equalDate(OEUtils.DateUtils.parse('2/29:16', 'US'), new Date('2016/2/29'));
    assert.equalDate(OEUtils.DateUtils.parse('2,29:00', 'US'), new Date('2000/2/29'));
    assert.equalDate(OEUtils.DateUtils.parse('2,29/96', 'US'), new Date('1996/2/29'));
    done();
  });
  it('should return undefVal when the date is not valid', function cb(done) {
    assert.equal(undefVal, OEUtils.DateUtils.parse('0&01&2014', 'US', '&'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('05*0*14', 'US', '*'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('13@1@15', 'US', '@'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('1$32$98', 'US', '$'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('16&35-2015', 'US', '&'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('4-31&2015', 'US', '&'));
    done();
  });
  it('should return the actual date when the date is valid', function cb(done) {
    assert.equalDate(OEUtils.DateUtils.parse('10*01*2014', 'US', '*'), new Date(
      '2014/10/1'));
    assert.equalDate(OEUtils.DateUtils.parse('10&01&14', 'US', '&'), new Date(
      '2014/10/1'));
    assert.equalDate(OEUtils.DateUtils.parse('10@10@2014', 'US', '@'), new Date(
      '2014/10/10'));
    assert.equalDate(OEUtils.DateUtils.parse('10$2$2014', 'US', '$'), new Date(
      '2014/10/2'));
    assert.equalDate(OEUtils.DateUtils.parse('2*29:2016', 'US', '*'), new Date(
      '2016/2/29'));
    assert.equalDate(OEUtils.DateUtils.parse('2:29&16', 'US', '&'), new Date(
      '2016/2/29'));
    assert.equalDate(OEUtils.DateUtils.parse('2*29 00', 'US', '*'), new Date(
      '2000/2/29'));
    assert.equalDate(OEUtils.DateUtils.parse('2@29:96', 'US', '@'), new Date(
      '1996/2/29'));
    done();
  });
  it('should return undefVal when the date is not valid', function cb(done) {
    assert.equal(undefVal, OEUtils.DateUtils.parse('0014', 'US'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('1012', 'US'));
    done();
  });
  it('should return the actual date when the date is valid', function cb(done) {
    assert.equalDate(OEUtils.DateUtils.parse('3298', 'US'), new Date('1998/3/2'));
    assert.equalDate(OEUtils.DateUtils.parse('3145', 'US'), new Date('2045/3/1'));
    assert.equalDate(OEUtils.DateUtils.parse('4378', 'US'), new Date('1978/4/3'));
    assert.equalDate(OEUtils.DateUtils.parse('3190', 'US'), new Date('1990/3/1'));
    assert.equalDate(OEUtils.DateUtils.parse('6798', 'US'), new Date('1998/6/7'));
    assert.equalDate(OEUtils.DateUtils.parse('4356', 'US'), new Date('2056/4/3'));
    assert.equalDate(OEUtils.DateUtils.parse('3245', 'US'), new Date('2045/3/2'));
    assert.equalDate(OEUtils.DateUtils.parse('8790', 'US'), new Date('1990/8/7'));
    done();
  });
  it('should return undefVal when the date is not valid or ambiguous', function cb(done) {
    assert.equal(undefVal, OEUtils.DateUtils.parse('00014', 'US'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('10012', 'US'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('01012', 'US'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('12112', 'US'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('23112', 'US'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('11112', 'US'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('11212', 'US'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('12212', 'US'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('12715', 'US'));
    done();
  });
  it('should return the actual date when the date is valid', function cb(done) {
    assert.equalDate(OEUtils.DateUtils.parse('13112', 'US'), new Date('2012/1/31'));
    assert.equalDate(OEUtils.DateUtils.parse('33114', 'US'), new Date('2014/3/31'));
    assert.equalDate(OEUtils.DateUtils.parse('32916', 'US'), new Date('2016/3/29'));
    assert.equalDate(OEUtils.DateUtils.parse('21398', 'US'), new Date('1998/2/13'));
    assert.equalDate(OEUtils.DateUtils.parse('61513', 'US'), new Date('2013/6/15'));
    done();
  });
  it('should return undefVal when the date is not valid or ambiguous', function cb(done) {
    assert.equal(undefVal, OEUtils.DateUtils.parse('000012', 'US'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('120013', 'US'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('131314', 'US'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('341214', 'US'));
    done();
  });
  it('should return the actual date when the date is valid', function cb(done) {
    assert.equalDate(OEUtils.DateUtils.parse('100410', 'US'), new Date('2010/10/4'));
    assert.equalDate(OEUtils.DateUtils.parse('033198', 'US'), new Date('1998/3/31'));
    assert.equalDate(OEUtils.DateUtils.parse('120715', 'US'), new Date('2015/12/7'));
    assert.equalDate(OEUtils.DateUtils.parse('022916', 'US'), new Date('2016/2/29'));
    assert.equalDate(OEUtils.DateUtils.parse('031198', 'US'), new Date('1998/3/11'));
    assert.equalDate(OEUtils.DateUtils.parse('110513', 'US'), new Date('2013/11/5'));
    done();
  });
  it('should return undefVal when the date is not valid or ambiguous', function cb(done) {
    assert.equal(undefVal, OEUtils.DateUtils.parse('0002016', 'US'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('1002013', 'US'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('1112019', 'US'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('1131998', 'US'));
    done();
  });
  it('should return the actual date when the date is valid', function cb(done) {
    assert.equalDate(OEUtils.DateUtils.parse('4102010', 'US'), new Date('2010/4/10'));
    assert.equalDate(OEUtils.DateUtils.parse('3131998', 'US'), new Date('1998/3/13'));
    assert.equalDate(OEUtils.DateUtils.parse('7122015', 'US'), new Date('2015/7/12'));
    assert.equalDate(OEUtils.DateUtils.parse('2222016', 'US'), new Date('2016/2/22'));
    assert.equalDate(OEUtils.DateUtils.parse('1301998', 'US'), new Date('1998/1/30'));
    assert.equalDate(OEUtils.DateUtils.parse('5112013', 'US'), new Date('2013/5/11'));
    done();
  });
  it('should return undefVal when the date is not valid or ambiguous', function cb(done) {
    assert.equal(undefVal, OEUtils.DateUtils.parse('00002016', 'US'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('10002013', 'US'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('14002013', 'US'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('10322013', 'US'));
    done();
  });
  it('should return the actual date when the date is valid', function cb(done) {
    assert.equalDate(OEUtils.DateUtils.parse('10042010', 'US'), new Date('2010/10/4'));
    assert.equalDate(OEUtils.DateUtils.parse('03311998', 'US'), new Date('1998/3/31'));
    assert.equalDate(OEUtils.DateUtils.parse('12072015', 'US'), new Date('2015/12/7'));
    assert.equalDate(OEUtils.DateUtils.parse('02292016', 'US'), new Date('2016/2/29'));
    assert.equalDate(OEUtils.DateUtils.parse('03111998', 'US'), new Date('1998/3/11'));
    assert.equalDate(OEUtils.DateUtils.parse('11052013', 'US'), new Date('2013/11/5'));
    done();
  });
  it('should return undefVal when the date is not valid', function cb(done) {
    assert.equal(undefVal, OEUtils.DateUtils.parse('0-01-2014'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('05-0-14'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('14-13-15'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('32-13-98'));
    done();
  });
  it('should return the actual date when the date is valid', function cb(done) {
    assert.equalDate(OEUtils.DateUtils.parse('01-10-2014'), new Date('2014/10/1'));
    assert.equalDate(OEUtils.DateUtils.parse('10-01-14'), new Date('2014/1/10'));
    assert.equalDate(OEUtils.DateUtils.parse('10-10-2014'), new Date('2014/10/10'));
    assert.equalDate(OEUtils.DateUtils.parse('10-2-2014'), new Date('2014/2/10'));
    assert.equalDate(OEUtils.DateUtils.parse('29-2-2016'), new Date('2016/2/29'));
    assert.equalDate(OEUtils.DateUtils.parse('29-2-16'), new Date('2016/2/29'));
    assert.equalDate(OEUtils.DateUtils.parse('29-2-00'), new Date('2000/2/29'));
    assert.equalDate(OEUtils.DateUtils.parse('29-2-96'), new Date('1996/2/29'));
    done();
  });
  it('should return undefVal when the date is not valid or ambiguous', function cb(done) {
    assert.equal(undefVal, OEUtils.DateUtils.parse('0012'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('1012'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('11213'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('21214'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('2122014'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('1122016'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('1002014'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('0072019'));
    done();
  });
  it('should return the actual date when the date is valid', function cb(done) {
    assert.equalDate(OEUtils.DateUtils.parse('01102014'), new Date('2014/10/1'));
    assert.equalDate(OEUtils.DateUtils.parse('100114'), new Date('2014/1/10'));
    assert.equalDate(OEUtils.DateUtils.parse('10102014'), new Date('2014/10/10'));
    assert.equalDate(OEUtils.DateUtils.parse('1022014'), new Date('2014/2/10'));
    assert.equalDate(OEUtils.DateUtils.parse('2922016'), new Date('2016/2/29'));
    assert.equalDate(OEUtils.DateUtils.parse('29216'), new Date('2016/2/29'));
    assert.equalDate(OEUtils.DateUtils.parse('29200'), new Date('2000/2/29'));
    assert.equalDate(OEUtils.DateUtils.parse('29296'), new Date('1996/2/29'));
    done();
  });
  it('should return undefVal when the date is not valid', function cb(done) {
    assert.equal(undefVal, OEUtils.DateUtils.parse('0-01-2014', 'MM-DD-YYYY'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('05-0-14', 'DD-MM-YY'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('14-13-15', 'DD-MM-YY'));
    assert.equal(undefVal, OEUtils.DateUtils.parse('32-13-98', 'DD-MM-YY'));
    done();
  });
  it('should return the actual date when the date is valid', function cb(done) {
    assert.equalDate(OEUtils.DateUtils.parse('01-10-2014', 'DD-MM-YYYY'), new Date('2014/10/1'));
    assert.equalDate(OEUtils.DateUtils.parse('10-01-14', 'DD-MM-YYYY'), new Date('2014/1/10'));
    assert.equalDate(OEUtils.DateUtils.parse('01-10-2014', 'MM-DD-YYYY'), new Date('2014/01/10'));
    assert.equalDate(OEUtils.DateUtils.parse('10-01-14', 'MM-DD-YYYY'), new Date('2014/10/01'));
    done();
  });

  it('should return the actual date when the date is valid', function cb(done) {
    /* 1st Oct 2014 */
    assert.equalDate(OEUtils.DateUtils.parse('01102014', 'DDMMYYYY'), new Date('2014/10/1'));

    /* Jan 10th 2014 */
    assert.equalDate(OEUtils.DateUtils.parse('01102014', 'MMDDYYYY'), new Date('2014/01/10'));
    done();
  });
  it('When format is not provided, input is returned as it is', function cb(done) {
    assert.equal(OEUtils.DateUtils.format('10-10-2013', ''), '10-10-2013');
    done();
  });
  it('format "l" is treated as "MM/DD/YYYY"', function cb(done) {
    assert.equal(OEUtils.DateUtils.format(Date.UTC(2015, 2, 16), 'l'), '03/16/2015');
    done();
  });
  it('DDD shows day of week string', function cb(done) {
    assert.equal(OEUtils.DateUtils.format(Date.UTC(2015, 2, 16), 'DDD'), 'Mon');
    done();
  });
  it('dddd shows full day of week string', function cb(done) {
    assert.equal(OEUtils.DateUtils.format(Date.UTC(2015, 2, 16), 'dddd'), 'Monday');
    done();
  });
  it('DD shows day of month string', function cb(done) {
    assert.equal(OEUtils.DateUtils.format(Date.UTC(2015, 2, 16), 'DD'), '16');
    done();
  });
  it('DD prefixes 0 if required', function cb(done) {
    assert.equal(OEUtils.DateUtils.format(Date.UTC(2015, 2, 6), 'DD'), '06');
    done();
  });
  it('D shows day of month without prefixing zero', function cb(done) {
    assert.equal(OEUtils.DateUtils.format(Date.UTC(2015, 2, 6), 'D'), '6');
    done();
  });
  it('MMM shows month string', function cb(done) {
    assert.equal(OEUtils.DateUtils.format(Date.UTC(2015, 2, 16), 'MMM'), 'Mar');
    done();
  });
  it('MM shows month', function cb(done) {
    assert.equal(OEUtils.DateUtils.format(Date.UTC(2015, 10, 16), 'MM'), '11');
    done();
  });
  it('MM prefixes 0 if required', function cb(done) {
    assert.equal(OEUtils.DateUtils.format(Date.UTC(2015, 2, 6), 'MM'), '03');
    done();
  });
  it('M shows day of month without prefixing zero', function cb(done) {
    assert.equal(OEUtils.DateUtils.format(Date.UTC(2015, 2, 6), 'M'), '3');
    done();
  });

  it('YYYY shows full year', function cb(done) {
    assert.equal(OEUtils.DateUtils.format(Date.UTC(2015, 2, 16), 'YYYY'), '2015');
    done();
  });

  it('YY shows year', function cb(done) {
    assert.equal(OEUtils.DateUtils.format(Date.UTC(2015, 10, 16), 'YY'), '15');
    done();
  });

  it('Y shows full year', function cb(done) {
    assert.equal(OEUtils.DateUtils.format(Date.UTC(2015, 2, 6), 'Y'), '2015');
    done();
  });

  it('Y shows full year', function cb(done) {
    assert.equal(OEUtils.DateUtils.format('Fri Aug 04 2017 12:00:00 GMT+0530 (India Standard Time)', 'DDD YYYY MM D'), 'Fri 2017 08 4');
    done();
  });
});
