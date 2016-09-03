const CronJob = require('cron').CronJob
const storage = require('node-persist')
const airac = require('./lib/airac')
const eaip = require('./lib/eaip')

storage.initSync()

const cacheKey = status => status.validFrom + status.validUntil

const cacheGet = status => storage.getItem(cacheKey(status))

const cacheSet = results => storage.setItem(cacheKey(results), results).then(() => results)

const syncAndRefresh = force =>
  airac.sync().then(status =>
    cacheGet(status).then(cached => {
      if (force || !cached) {
        return eaip.refresh(status).then(cacheSet)
      }
      return cached
    })
  )

module.exports = {
  current: () => airac.status().then(cacheGet),
  status: () => airac.status(),
  init: (dir = './data', scheduleEveryNthDay = 0, force = false) => {
    airac.init(dir)

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
