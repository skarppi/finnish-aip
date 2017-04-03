const scrapy = require('node-scrapy')
const moment = require('moment')

// 25 MAY 2017 to 2017-05-25
const dateParser = (str) =>
  moment.utc(str, 'DD MMM YYYY').format('YYYY-MM-DD')

const fetchAvailableImages = () => {
  const site = 'https://ais.fi'
  const path = `${site}/en/products-and-services/aip-iso-image`
  return new Promise((resolve, reject) => {
    const model = {
      links: {
        selector: 'table:first-of-type tr > td a',
        get: 'href',
        prefix: site
      },
      cycles: {
        selector: 'table:first-of-type tr > td:nth-child(2)',
      }
    }

    scrapy.scrape(path, model, (err, cells) => {
      if (err) {
        reject(err)
      } else if (cells.links) {
        resolve(cells.links.map((url, index) => (
          {
            cycle: dateParser(cells.cycles[index]),
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
