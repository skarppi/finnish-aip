const turf = require('turf')
const debug = require('debug')('finnish-aip')
const parser = require('./parser')

const flatten = (nested) =>
  nested.reduce((prev, next) =>
    (next ? prev.concat(next) : prev), []
  )

const parseAerodromes = (data, title) =>
  parser.polygonTable(data, title, (name, row) => {
    const limits = row[1]
    const callSigns = row[3]
    const languages = callSigns.pop().split(', ')

    return {
      designation: name,
      upperVerticalLimit: limits[0],
      lowerVerticalLimit: limits[1],
      airspaceClass: row[2],
      callSigns,
      languages,
      hoursOfApplicability: row[4],
      rmk: row[5],
    }
  })

const parseRunways = (data, title) =>
  parser.table(data, title, 2).map(row => (
    {
      rwy: row[0],
      bearingDegrees: row[1],
      dimensionsInMeters: row[2],
      surface: row[3],
      threshold: turf.point(parser.coordinate(row[4][2]), {
        elevation: row[5][0],
        displaced: (row[4][0] === 'DTHR'),
      }),
      runwayEnd: turf.point(parser.coordinate(row[4][3]), {
        elevation: row[5][1],
      }),
    }
  ))

const parseAirspaces = (data, title) =>
  parser.polygonTable(data, title, (name, row) => {
    const limits = row[1]
    const callSigns = row[3]

    const firstFrequency = callSigns.findIndex(r => !isNaN(r))

    const frequency = callSigns.slice(firstFrequency)
    const languages = callSigns.slice(firstFrequency - 1, firstFrequency)
      .join(',').replace(/ /g, '').split(',')

    return {
      designation: name,
      upperVerticalLimit: limits[0],
      lowerVerticalLimit: limits[1],
      airspaceClass: row[2],
      callSigns: callSigns.slice(0, firstFrequency - 1),
      languages,
      frequency,
      hoursOfApplicability: row[4],
      rmk: row[5],
    }
  })

const parseProhibited = (data, title) =>
  parser.polygonTable(data, title, (name, row) => {
    const limits = row[1]
    return {
      designation: name,
      upperVerticalLimit: limits[0],
      lowerVerticalLimit: limits[1],
      activityType: row[2],
      hoursOfApplicability: row[3],
      rmk: row[4],
    }
  })

const loop = (glob, pattern, cb) =>
  glob(pattern).then(files =>
    Promise.all(
      files.map(file =>
        parser.pdf(file).then(data => cb(data, file))
      )
    ).then(features => flatten(features))
  )

const aerodromes = glob =>
  loop(glob, 'aerodromes/*_AD_2_EF*.pdf', (data, file) => {
    const id = file.match(/AD_2_([\w]{4})/)[1]
    return {
      identifier: id,
      airspaces: parseAerodromes(data, `${id} AD 2.17`),
      runways: parseRunways(data, `${id} AD 2.12`),
    }
  })

const airspaces = glob =>
  loop(glob, 'enr/*_ENR_2_1*.pdf', data => parseAirspaces(data, '2.1.4 FIZ UPPER, TMA'))
    .then(features => turf.featureCollection(features))

const dangers = glob =>
  loop(glob, 'enr/*_ENR_5_1*.pdf', data => parseProhibited(data, 'Prohibited areas'))
    .then(features => turf.featureCollection(features))

const refresh = ({ cycle, validFrom, validUntil, files }) => {
  debug(`refresh eaip to ${cycle}`)
  return Promise.all(
    [
      aerodromes(files),
      airspaces(files),
      dangers(files),
    ]
  ).then(features => {
    const json = {
      aerodromes: features[0],
      tma: features[1],
      prohibitedAreas: features[2],
      validFrom,
      validUntil,
      cycle,
    }
    json.validFrom = validFrom
    json.validUntil = validUntil
    json.cycle = cycle
    return json
  })
}

module.exports = {
  refresh,
}
