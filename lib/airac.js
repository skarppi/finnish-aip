const glob = require('glob-promise')
const moment = require('moment')
const debug = require('debug')('finnish-aip')
const scraper = require('./scraper')
const downloader = require('./downloader')

let DATA_DIR

const listCycles = () =>
  glob(`${DATA_DIR}/*`).then(airacCycles =>
    airacCycles.map(file => {
      const date = file.split('/').reverse()[0]
      return moment.utc(date, 'YYYY-MM-DD')
    })
  )

const status = () => {
  if (!DATA_DIR) {
    return Promise.reject('not initialized')
  }

  return listCycles().then(cycles => {
    const nextCycle = cycles.find(cycle => cycle.isAfter())
    const index = nextCycle ? cycles.indexOf(nextCycle) : cycles.length
    const currentCycle = cycles[index - 1]
    const date = currentCycle && currentCycle.format('YYYY-MM-DD')
    return {
      cycle: date,
      validFrom: currentCycle && currentCycle.toISOString(),
      validUntil: nextCycle && nextCycle.toISOString(),
      files: filter => glob(`${DATA_DIR}/${date}/${filter}`),
    }
  })
}

const sync = () => {
  debug('started sync')
  return Promise.all([scraper(), listCycles()]).then(([images, existing]) => {
    Promise.all(images.map(({ cycle, url }) => {
      if (existing.find(e => e.format('YYYY-MM-DD') === cycle)) {
        debug(`cycle ${cycle} already exists`)
        return Promise.resolve(true)
      }
      return downloader.start(url, DATA_DIR, cycle)
    }))
  }).then(() => {
    debug('finished sync')
    return status()
  })
}

const init = (dir) => {
  DATA_DIR = dir
}

module.exports = {
  status,
  sync,
  init,
}
