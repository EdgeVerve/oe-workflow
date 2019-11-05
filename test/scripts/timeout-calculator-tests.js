/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
let bootstrap = require('../bootstrap.js');
let chai = bootstrap.chai;
let assert = chai.assert;
chai.use(require('chai-datetime'));
let timeoutCalculator = require('../../lib/utils/timeout-calculator.js');


describe('Timeout calculator tests', function callback() {
  var baseDate;
  before(function setupFunc() {
    baseDate = new Date();
  });
  /* eslint-disable */
  let undefVal = undefined;
  /* eslint-enable */
  it('should return now+milliseconds when input is number ', function cb(done) {
    let results = timeoutCalculator.getSchedule(5000, baseDate);
    assert.deepEqual(results.items, [new Date(baseDate.getTime() + 5000)]);
    done();
  });

  it('should return now+milliseconds when input is number as string', function cb(done) {
    let results = timeoutCalculator.getSchedule('5000', baseDate);
    assert.deepEqual(results.items, [new Date(baseDate.getTime() + 5000)]);
    done();
  });

  it('should return date when input is date', function cb(done) {
    let defDate = new Date(baseDate.getTime() + 594583);
    let results = timeoutCalculator.getSchedule(defDate, baseDate);
    assert.deepEqual(results.items, [defDate]);
    done();
  });

  it('should return date when input is date as string', function cb(done) {
    let defDate = new Date(baseDate.getTime() + 594583);
    let results = timeoutCalculator.getSchedule(defDate.toISOString(), baseDate);
    assert.deepEqual(results.items, [defDate]);
    done();
  });

  it('calculates period relative to given date', function cb(done) {
    let results = timeoutCalculator.getSchedule('P1Y2M3DT3H6M9S', baseDate);
    let expected = new Date(baseDate.getFullYear() + 1, baseDate.getMonth() + 2, baseDate.getDate() + 3, baseDate.getHours() + 3, baseDate.getMinutes() + 6, baseDate.getSeconds() + 9, baseDate.getMilliseconds());
    assert.deepEqual(results.items, [expected]);
    done();
  });

  it('calculates # separated periods as array', function cb(done) {
    let results = timeoutCalculator.getSchedule('P5D#P7D#P9D', baseDate);
    assert.equal(results.items.length, 3);
    assert.deepEqual(results.items, [5, 7, 9].map(item => new Date(baseDate.getTime() + (item * 24 * 3600 * 1000))));
    done();
  });

  it('calculates intervals relative to base', function cb(done) {
    let results = timeoutCalculator.getSchedule('R4/P7D', baseDate);
    assert.equal(results.items.length, 4);
    assert.deepEqual(results.items, [7, 14, 21, 28].map(item => new Date(baseDate.getTime() + (item * 24 * 3600 * 1000))));
    done();
  });

  it('calculates intervals relative to specified start date', function cb(done) {
    let refDate = new Date(baseDate.getTime() + 48344983);

    let results = timeoutCalculator.getSchedule(`R3/${refDate.toISOString()}/P4D`, baseDate);
    assert.equal(results.items.length, 3);
    assert.deepEqual(results.items, [0, 4, 8].map(item => new Date(refDate.getTime() + (item * 24 * 3600 * 1000))));
    done();
  });

  it('calculates intervals relative to specified start period', function cb(done) {
    let results = timeoutCalculator.getSchedule('R3/P8D/P1D', baseDate);
    assert.equal(results.items.length, 3);
    assert.deepEqual(results.items, [8, 9, 10].map(item => new Date(baseDate.getTime() + (item * 24 * 3600 * 1000))));
    done();
  });
});
