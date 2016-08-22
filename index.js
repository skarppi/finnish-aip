const CronJob = require('cron').CronJob
const airac = require('./lib/airac')
const eaip = require('./lib/eaip')
const storage = require('./lib/storage')

const queryCache = status => {
  const cached = storage.getItem(status.cycle)
  if (status.equals(cached)) {
    return cached
  }
  return undefined
}

const syncAndRefresh = force =>
  airac.sync().then(status => {
    if (force || queryCache(status) === undefined) {
      return eaip.refresh(status).then(results =>
        storage.setItem(status.cycle, results)
      )
    }
    return Promise.reject('304 Not Modified')
  })

module.exports = {
  airspaces: () => airac.status().then(queryCache),
  status: () => airac.status(),
  init: (DATA_DIR, scheduleEveryNthDay, force) => {

    airac.init(DATA_DIR)

    if (Number.isInteger(scheduleEveryNthDay) && scheduleEveryNthDay > 0) {
      const cron = new CronJob({
        // seconds minutes hours dayOfMonth months dayOfWeek
        cronTime: `0 0 0 */${scheduleEveryNthDay} * *`,
        onTick: syncAndRefresh,
        runOnInit: true,
      })
      cron.start()
    }
    return syncAndRefresh(force)
  },
}
