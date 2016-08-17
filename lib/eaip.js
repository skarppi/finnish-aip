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

const aerodromes = cycle =>
  cycle.files('aerodromes/*_AD_2_EF*.pdf').then(files =>
    Promise.all(
      files.map(file => {
        const id = file.match(/AD_2_([\w]{4})/)[1]
        return parser.pdf(file).then(data => parseAerodromes(data, `${id} AD 2.17`))
      })
    ).then(features => flatten(features))
  )

const airspaces = cycle =>
  cycle.files('enr/*_ENR_2_1*.pdf').then(files =>
    Promise.all(
      files.map(file =>
        parser.pdf(file).then(data => parseAirspaces(data, '2.1.4 FIZ UPPER, TMA'))
      )
    ).then(features => flatten(features))
  )

const dangers = cycle =>
  cycle.files('enr/*_ENR_5_1*.pdf').then(files =>
    Promise.all(
      files.map(file =>
        parser.pdf(file).then(data => parseProhibited(data, 'Prohibited areas'))
      )
    ).then(features => flatten(features))
  )

const refresh = (status) => {
  debug(`refresh eaip to ${status.cycle}`)
  return Promise.all(
    [
      aerodromes(status),
      airspaces(status),
      dangers(status),
    ]
  ).then(features => {
    const json = turf.featureCollection(flatten(features))
    json.validFrom = status.validFrom
    json.validUntil = status.validUntil
    json.cycle = status.cycle
    return json
  })
}

module.exports = {
  refresh,
}
