const scrapy = require('node-scrapy')
const moment = require('moment')

const dateFromUrl = (url) => {
  // http://ais.fi/files/finavia2/iso-image/AMDT_03_2016_iso_eaip_finland_26may2016.iso
  const date = url.split('_').reverse()[0].replace('.iso', '')
  return moment.utc(date, 'DDMMMYYYY').format('YYYY-MM-DD')
}

const fetchAvailableImages = () => {
  const site = 'https://ais.fi'
  const path = `${site}/C-en/services_en/downloads`
  return new Promise((resolve, reject) => {
    const model = {
      selector: 'table:first-of-type tr > td a',
      get: 'href',
      prefix: site,
    }

    scrapy.scrape(path, model, (err, urls) => {
      if (err) {
        reject(err)
      } else if (urls) {
        resolve(urls.map(url => (
          {
            cycle: dateFromUrl(url),
            url,
          }
        )))
      } else {
        resolve([])
      }
    })
  })
}

module.exports = fetchAvailableImages
