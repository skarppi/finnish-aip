/* eslint-env mocha */
const chai = require('chai')
const eaip = require('../lib/eaip')
const downloader = require('../lib/downloader')
const nock = require('nock')
const fs = require('fs')
const path = require('path')

chai.should()

const TMP_DIR = path.join(__dirname, '../tmp')

const aerodromes = `${TMP_DIR}/EF_AD_2_EFHK_EN.pdf`
const airspaces = `${TMP_DIR}/EF_ENR_2_1_EN.pdf`
const dangers = `${TMP_DIR}/EF_ENR_5_1_EN.pdf`

function* downloadTestFiles() {
  nock('https://ais.fi', { allowUnmocked: true })
    .get('ais/eaip/pdf/**.pdf')
    .reply(200, 'OK!')

  if (!fs.existsSync(aerodromes)) {
    yield downloader.downloadFile('https://ais.fi/ais/eaip/pdf/aerodromes/EF_AD_2_EFHK_EN.pdf', aerodromes)
  }

  if (!fs.existsSync(airspaces)) {
    yield downloader.downloadFile('https://ais.fi/ais/eaip/pdf/enr/EF_ENR_2_1_EN.pdf', airspaces)
  }

  if (!fs.existsSync(dangers)) {
    yield downloader.downloadFile('https://ais.fi/ais/eaip/pdf/enr/EF_ENR_5_1_EN.pdf', dangers)
  }
}

const init = downloadTestFiles()
while (!init.next().done) {
  // loop
}

describe('Parse AIP files', () => {
  it('should parse EFHK CTR', () => {
    const expected = JSON.parse(
      fs.readFileSync(`${__dirname}/resources/EF_AD_2_EFHK_EN.json`, 'utf8')
    )

    const files = (glob) => {
      if (glob.indexOf('aerodromes') === 0) {
        return Promise.resolve([aerodromes])
      }
      return Promise.resolve([])
    }
    return eaip.refresh({ cycle: 'test', validFrom: '', validUntil: '', files }).then((res) => {
      res.aerodromes.should.deep.equal([expected])
    })
  })
})
