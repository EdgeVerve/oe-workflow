var utils = require('./oe-date-utils.js')

module.exports.parse_date = function parse_date(input, format) {

  if (!input || input.trim().length === 0) {
    return undefined;
  }
  var tuInput = input.trim().toUpperCase();

  var retDate;

  //reference for date calculation is today in user's timezone
  //but represented as UTC.
  //i.e. if entering '1d' at 2AM IST on 5th. It should calculate 6th as the date.
  //but 6th 00:00:00Z in UTC timezone.
  var mDate = new Date();
  mDate = new Date(Date.UTC(mDate.getFullYear(), mDate.getMonth(), mDate.getDate()));

  if (tuInput === 'T' || tuInput === 'TOD' || tuInput === 'TODAY') {
    retDate = mDate;
  } else if (tuInput == 'TOM') {
    retDate = mDate.setUTCDate(mDate.getUTCDate() + 1);
  } else if (tuInput[tuInput.length - 1] === 'D') {
    retDate = _calcDate(mDate, tuInput, 'days');
  } else if (tuInput[tuInput.length - 1] === 'W') {
    retDate = _calcDate(mDate, tuInput, 'weeks');
  } else if (tuInput[tuInput.length - 1] === 'M') {
    retDate = _calcDate(mDate, tuInput, 'months');
  } else if (tuInput[tuInput.length - 1] === 'Q') {
    retDate = _calcDate(mDate, tuInput, 'quarters');
  } else if (tuInput[tuInput.length - 1] === 'Y') {
    retDate = _calcDate(mDate, tuInput, 'years');
  } else {
    retDate = utils.DateUtils.parse(tuInput, format);
  }

  return retDate;
}

function _parseDecimal(input) {
  if (!input || input.length === 0) {
    return undefined;
  }

  var tmp = input;

  var isInvalid = tmp.split('.').length > 2 || tmp.lastIndexOf('+') > 0 || tmp.lastIndexOf('-') > 0 || tmp.replace(
    /[\+\-0-9\.]/g, '').length > 0;
  if (isInvalid) {
    return undefined;
  }
  return parseFloat(tmp);
}

function _calcDate(mDate, tuInput, type) {
  var retDate;
  var topup = tuInput.length === 1 ? 1 : _parseDecimal(tuInput.slice(0, tuInput.length - 1));
  if (!isNaN(topup)) {
    retDate = new Date(mDate.getTime());
    switch (type) {
      case 'days':
        var newDay = retDate.getUTCDate() + topup;
        retDate.setUTCDate(newDay);
        break;

      case 'weeks':
        var newDay = retDate.getUTCDate() + 7 * topup; //eslint-disable-line no-redeclare
        retDate.setUTCDate(newDay);
        break;

      case 'months':
        var newMonth = retDate.getUTCMonth() + topup;
        retDate.setUTCMonth(newMonth);
        break;

      case 'quarters':
        var newMonth = retDate.getUTCMonth() + 3 * topup; //eslint-disable-line no-redeclare
        retDate.setUTCMonth(newMonth);
        break;

      case 'years':
        var newyear = retDate.getUTCFullYear() + topup;
        retDate.setUTCFullYear(newyear);
        break;

      default:
        break;
    }
  }
  return retDate;
}
