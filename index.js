const CronJob = require('cron').CronJob
const airac = require('./lib/airac')

module.exports = {
  status: () => {
    airac.current()
  },
  sync: (scheduleEveryNthDay) => {
    airac.sync()

    if (scheduleEveryNthDay) {
      const cron = new CronJob({
        // seconds minutes hours dayOfMonth months dayOfWeek
        cronTime: `0 0 0 */${scheduleEveryNthDay} * *`,
        onTick: airac.sync,
        runOnInit: true,
      })
      cron.start()
    }
  },
}
