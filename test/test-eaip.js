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

const RESOURCES_DIR = path.join(__dirname, 'resources')

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
  const expected = JSON.parse(
    fs.readFileSync(`${__dirname}/resources/EF_AD_2_EFHK_EN.json`, 'utf8')
  )

  const aerodromeFiles = (src) => {
    return (glob) => {
      if (glob.indexOf('aerodromes') === 0) {
        return Promise.resolve([src])
      }
      return Promise.resolve([])
    }
  }

  it('should parse EFHK CTR from latest available file', () => {
    const files = aerodromeFiles(aerodromes)
    return eaip.refresh({ cycle: 'test', validFrom: '', validUntil: '', files }).then((res) => {
      res.aerodromes.should.deep.equal([expected])
    })
  })

  it('should parse EFHK CTR with vlines & hlines', () => {
    const files = aerodromeFiles(`${RESOURCES_DIR}/EF_AD_2_EFHK_EN-2016-12-08.pdf`)
    return eaip.refresh({ cycle: 'test', validFrom: '', validUntil: '', files}).then((res) =>
      res.aerodromes.should.deep.equal([expected])
    )
  })

  it('should parse EFHK CTR without vlines & hlines', () => {
    const files = aerodromeFiles(`${RESOURCES_DIR}/EF_AD_2_EFHK_EN-2017-02-02.pdf`)
    return eaip.refresh({ cycle: 'test', validFrom: '', validUntil: '', files}).then((res) => {
      res.aerodromes.should.deep.equal([expected])
    })
  })
})
