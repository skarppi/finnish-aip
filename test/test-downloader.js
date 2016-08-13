/* eslint-env mocha */
const fs = require('fs')
const chai = require('chai')
const chaiAsPromises = require('chai-as-promised')
const nock = require('nock')
const downloader = require('../lib/downloader')

chai.should()
chai.use(chaiAsPromises)

const ws = nock('https://ais.fi')
  .get('/files/finavia2/iso-image/AMDT_XX_2016_iso_eaip_finland_14aug2016.iso')

const url = 'https://ais.fi/files/finavia2/iso-image/AMDT_XX_2016_iso_eaip_finland_14aug2016.iso'

const cleanup = () => {
  if (fs.existsSync('./data/TEST')) {
    fs.unlinkSync('./data/TEST/aerodromes/EF_AD_2_EFHF_EN.pdf')
    fs.rmdirSync('./data/TEST/aerodromes')

    fs.unlinkSync('./data/TEST/enr/EF_ENR_1_1_EN.pdf')
    fs.rmdirSync('./data/TEST/enr')

    fs.rmdirSync('./data/TEST')
  }
}

describe('Downloader', () => {
  it('should extract iso image', () => {
    cleanup()

    ws.reply(200, (uri, requestBody, cb) => {
      fs.readFile('./test/resources/AMDT_XX_2016_iso_eaip_finland_14aug2016.iso', cb)
    })
    return downloader(url, 'data', 'TEST').should.be.fulfilled.then(() => {
      fs.existsSync('./data/TEST').should.equal(true)
      fs.readFileSync('./data/TEST/aerodromes/EF_AD_2_EFHF_EN.pdf', 'utf8').should.equal('EFHF')
      fs.readFileSync('./data/TEST/enr/EF_ENR_1_1_EN.pdf', 'utf8').should.equal('ENR')

      cleanup()
    })
  })
})
