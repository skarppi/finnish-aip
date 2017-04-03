const path = require('path')
const Zip = require('node-7z')
const mv = require('mv')
const https = require('https')
const fs = require('fs')
const debug = require('debug')('finnish-aip')
const mkdirp = require('mkdirp')

const TMP_DIR = path.join(__dirname, '../tmp')
mkdirp.mkdirp(TMP_DIR)

const downloadFile = (url, target) =>
  new Promise((resolve, reject) => {
    debug(`downloading ${url} to ${target}`)

    https.get(url, (response) => {
      if((response.headers['content-type'] || '').indexOf('text/html') === 0) {
        let html = ''
        response.on('data', (data) => {
          html += data
        })
        response.on('end', () => {
          var regex = /<meta http-equiv="Refresh" CONTENT="1;\s*URL=([^"]+)[^>]+>/i;
          var match = regex.exec(html)
          if (match[1] !== undefined) {
            downloadFile(match[1], target).then(resolve).catch(reject)
          }
        })
      } else {
        const out = fs.createWriteStream(target)
        response.pipe(out)
        out.on('finish', () => {
          out.close(() => resolve(true))
        })
      }
    }).on('error', err => {
      debug(`downloading ${url} failed ${err}`)
      // delete failed file
      fs.unlink(target)
      reject(err.message)
    })
  })

const unzipFile = (imageFile, tmpDir) => {
  debug(`extracting ${imageFile} to ${tmpDir}`)

  return new Zip().extractFull(imageFile, tmpDir, { wildcards: ['pdf'] })
    .catch(err => {
      // 7z fails sometimes with header errors even all files are extracted just fine.
      // Check for false alarms and swallow the error if target exists
      if (!fs.existsSync(`${tmpDir}/pdf`)) {
        throw err
      }
    })
}

const publishCycle = (tmpDir, targetDir) =>
  new Promise((resolve, reject) => {
    debug(`publishing ${tmpDir} to ${targetDir}`)
    mv(`${tmpDir}/pdf`, targetDir, err => {
      if (err) {
        reject(`move failed from ${tmpDir} to ${targetDir} ${err}`)
      } else {
        resolve(true)
      }
    })
  })

const cleanup = (imageFile, tmpDir) => {
  fs.unlinkSync(imageFile)
  fs.rmdirSync(tmpDir)
}

const start = (url, DATA_DIR, cycle) => {
  mkdirp.mkdirp(DATA_DIR)

  const filename = url.split('/').pop()
  const imageFile = `${TMP_DIR}/${cycle}.iso`
  const tmpDir = `${TMP_DIR}/${cycle}`
  const targetDir = `${DATA_DIR}/${cycle}`

  debug(`downloading airac cycle ${cycle} from ${url}`)
  return downloadFile(url, imageFile)
    .then(() => unzipFile(imageFile, tmpDir))
    .then(() => publishCycle(tmpDir, targetDir))
    .then(() => cleanup(imageFile, tmpDir))
}

module.exports = {
  downloadFile,
  start,
}
