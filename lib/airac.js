const path = require('path')
const fs = require('fs')
const glob = require('glob-promise')
const moment = require('moment')
const debug = require('debug')('finnish-aip')
const scraper = require('./scraper')
const downloader = require('./downloader')

const DATA_DIR = path.join(__dirname, '../data')
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdir(DATA_DIR)
}

const listCycles = () =>
  glob(`${DATA_DIR}/*`).then(airacCycles =>
    airacCycles.map(file => {
      const date = file.split('/').reverse()[0]
      return moment.utc(date, 'YYYY-MM-DD')
    })
  )

const current = () => listCycles().then(cycles => {
  const nextCycle = cycles.find(cycle => cycle.isAfter(moment.utc()))
  const index = nextCycle ? cycles.indexOf(nextCycle) : cycles.length
  const currentCycle = cycles[index - 1]
  return {
    validFrom: currentCycle,
    validUntil: nextCycle,
    files: (filter) => {
      const date = currentCycle.format('YYYY-MM-DD')
      return glob(`${DATA_DIR}/${date}/${filter}`)
    },
  }
})

const sync = () => {
  debug('started sync')
  return Promise.all([scraper(), listCycles()]).then(([images, existing]) => {
    const jobs = images.map(({ cycle, url }) => {
      if (existing.find(e => e.format('YYYY-MM-DD') === cycle)) {
        debug(`cycle ${cycle} already exists`)
        return Promise.resolve(true)
      }
      return downloader(url, DATA_DIR, cycle)
    })
    return Promise.all(jobs)
  }).then(res => {
    debug('finished sync')
    return res
  })
}

module.exports = {
  current,
  sync,
}
