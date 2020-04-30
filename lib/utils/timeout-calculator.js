var isoDuration = require('iso8601-duration');

function getDate(definition, base) {
  let retVal;
  if (!isNaN(Date.parse(definition))) {
    retVal = new Date(definition);
  } else {
    definition = isoDuration.parse(definition);
    retVal = isoDuration.end(definition, base);
  }
  return retVal;
}

function getSeconds(definition) {
  definition = isoDuration.parse(definition);
  return isoDuration.toSeconds(definition);
}

function getSchedule(definition, base) {
  base = base || new Date();

  let retVal = {
    perpetual: false,
    definition: definition
  };
  if (definition instanceof Date) {
    retVal.items = [definition];
  } else if (!isNaN(Number(definition))) {
    retVal.items = [new Date(base.getTime() + Number(definition))];
  } else if (!isNaN(Date.parse(definition))) {
    retVal.items = [new Date(definition)];
  } else if (definition[0] === 'P') {
    /* Simple period or Array of periods */
    retVal.items = definition.split('#').map(item => {
      let parsed = isoDuration.parse(item.trim());
      return isoDuration.end(parsed, base);
    });
  } else if (definition[0] === 'R') {
    let parts = definition.split('/');
    let recurrence = Number(parts[0].substr(1));
    if (recurrence < 0 || isNaN(recurrence)) {
      recurrence = 1;
    } else if (recurrence === 0) {
      retVal.perpetual = true;
    }
    let periodDef = parts[1];
    retVal.items = [];
    if (parts.length === 3) {
      /* Recurring periods with specified start/period */
      base = getDate(parts[1].trim(), base);
      periodDef = parts[2];
      retVal.definition = periodDef;
      retVal.items.push(base);
      recurrence -= 1;
    }

    let parsed = isoDuration.parse(periodDef);
    let newDate = base;
    for (let i = 0; i < recurrence; i++) {
      newDate = isoDuration.end(parsed, newDate);
      retVal.items.push(newDate);
    }
  }
  return retVal;
}

module.exports = {
  getSeconds,
  getDate,
  getSchedule
};
