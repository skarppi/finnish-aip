/* eslint-env mocha */
const fs = require('fs')
const chai = require('chai')
const chaiAsPromises = require('chai-as-promised')
const nock = require('nock')
const scraper = require('../lib/scraper')

chai.should()
chai.use(chaiAsPromises)

const ws = nock('https://ais.fi')
  .get('/C-en/services_en/downloads')

const file1 = '/files/finavia2/iso-image/AMDT_05_2016_iso_eaip_finland_15sep2016.iso'
const file2 = '/files/finavia2/iso-image/AMDT_04_2016_iso_eaip_finland_23jun2016.iso'
const file3 = '/files/finavia2/iso-image/AMDT_03_2016_iso_eaip_finland_26may2016.iso'

describe('Scraping', () => {
  it('should return empty list for unknown content', () => {
    ws.reply(200, 'no table')
    return scraper().should.eventually.deep.equal([])
  })
  it('should return links from table', () => {
    ws.reply(200, `
      <table>
        <tr>
          <td>
            <a href="${file1}">link1</a>
          </td>
        </tr>
        <tr>
          <td>
            <a href="${file2}">link2</a>
          </td>
        </tr>
      </table>`)
    return scraper().should.eventually.deep.equal([
      {
        cycle: '2016-09-15',
        url: `https://ais.fi${file1}`,
      },
      {
        cycle: '2016-06-23',
        url: `https://ais.fi${file2}`,
      },
    ])
  })
  it('should match live data', () => {
    ws.reply(200, (uri, requestBody, cb) => {
      fs.readFile('./test/resources/downloads.html', cb)
    })
    return scraper().should.eventually.deep.equal([
      {
        cycle: '2016-09-15',
        url: `https://ais.fi${file1}`,
      },
      {
        cycle: '2016-06-23',
        url: `https://ais.fi${file2}`,
      },
      {
        cycle: '2016-05-26',
        url: `https://ais.fi${file3}`,
      },
    ])
  })
})
