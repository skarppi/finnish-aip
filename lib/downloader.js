const path = require('path')
const Zip = require('node-7z')
const mv = require('mv')
const https = require('https')
const fs = require('fs')
const debug = require('debug')('finnish-aip')

const TMP_DIR = path.join(__dirname, '../tmp')
if (!fs.existsSync(TMP_DIR)) {
  fs.mkdir(TMP_DIR)
}

const downloadFile = (url, target) =>
  new Promise((resolve, reject) => {
    debug(`downloading ${url} to ${target}`)

    const out = fs.createWriteStream(target)
      https.get(url, (response) => {
        response.pipe(out)
        out.on('finish', () => {
          out.close(() => resolve(true))
        })
      }).on('error', err => {
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
  const filename = url.split('/').pop()
  const imageFile = `${TMP_DIR}/${filename}`
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
  start
}