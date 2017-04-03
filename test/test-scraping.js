/* eslint-env mocha */
const fs = require('fs')
const chai = require('chai')
const chaiAsPromises = require('chai-as-promised')
const nock = require('nock')
const scraper = require('../lib/scraper')

chai.should()
chai.use(chaiAsPromises)

const ws = nock('https://ais.fi')
  .get('/en/products-and-services/aip-iso-image')

const file1 = '/download_file/view/75'
const file2 = '/download_file/view/74'
const file3 = '/download_file/view/57'

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
          <td>25 MAY 2017</td>
        </tr>
        <tr>
          <td>
            <a href="${file2}">link2</a>
          </td>
          <td>30 MAR 2017</td>
        </tr>
      </table>`)
    return scraper().should.eventually.deep.equal([
      {
        cycle: '2017-05-25',
        url: `https://ais.fi${file1}`,
      },
      {
        cycle: '2017-03-30',
        url: `https://ais.fi${file2}`,
      },
    ])
  })
  it('should match live data', () => {
    ws.reply(200, (uri, requestBody, cb) => {
      fs.readFile('./test/resources/aip-iso-image.html', cb)
    })
    return scraper().should.eventually.deep.equal([
      {
        cycle: '2017-05-25',
        url: `https://ais.fi${file1}`,
      },
      {
        cycle: '2017-03-30',
        url: `https://ais.fi${file2}`,
      },
      {
        cycle: '2017-02-02',
        url: `https://ais.fi${file3}`,
      },
    ])
  })
})
