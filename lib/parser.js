const Dms = require('geodesy/dms')
const PDFParser = require('pdf2json/pdfparser')
const turf = require('turf')
const debug = require('debug')('finnish-aip')

const decode = (str) => decodeURIComponent(str).replace(/\s{1,}/g, ' ').trim()

const flatten = (nested) =>
  nested.reduce((prev, next) =>
    (next ? prev.concat(next) : prev), []
  )

const pairs = (array, cb) =>
  [...Array(array.length - 1)].map((_, i) =>
    cb(array[i], array[i + 1])
  )

const equals = (a, b) => (
  a.length === b.length && a.every((e, i) => {
    if (Array.isArray(e)) {
      return equals(e, b[i])
    }
    return e === b[i]
  })
)

const transpose = (array) =>
  Object.keys(array[0])
    .map(col => array.map(row => row[col]))

const dmsToDegrees = str => {
  const len = str.length
  const secondFractions = len > 8 ? 3 : 0 // either 601656N or 601656.12N

  const degrees = str.substring(0, len - secondFractions - 5)
  const minutes = str.substring(len - secondFractions - 5, len - secondFractions - 3)
  const seconds = str.substring(len - secondFractions - 3)

  const dms = `${degrees}° ${minutes}′ ${seconds}″`
  return Dms.parseDMS(dms)
}

const coordinate = str => {
  const parts = decode(str.replace('*', '')).split(' ')
  const lat = dmsToDegrees(parts[0])
  const lon = dmsToDegrees(parts[1])
  return [lon, lat]
}

const coordinates = cell =>
  cell.join('').replace(/ - /g, '-').split('-')
    .map(row => coordinate(row))

const parseTable = (page, offsetY) => {
  // table height is defined from borders
  const vlines = page.Fills
    .filter(line => line.y >= offsetY && line.w < 1)
    .sort((a, b) => a.y - b.y)

  const lh = 0.9

  const tableMinY = vlines[0].y - lh
  const tableMaxY = vlines[0].y + vlines[0].h

  // columns from left to right
  const cols = vlines
    .filter(line => line.y < tableMaxY)
    .map(line => line.x - lh)
    .sort((a, b) => a - b)


  if (cols.length === 0) return

  // rows from top to bottom
  const rows = page.Fills
    .filter(line => line.y > tableMinY && line.y < tableMaxY && line.h < 1)
    .sort((a, b) => a.y - b.y)

  // blocks for the table
  const blocks = page.Texts.filter(block => block.y > tableMinY && block.y < tableMaxY)

  // all main rows start at the same x-value
  const rowStart = Math.min(...rows.map(r => r.x))
  const mainRows = rows.filter(line => line.x === rowStart)

  // instead of looping row by row, loop from columns and then transpose
  // this way we can retrieve merged cells between rows
  return transpose(pairs(cols, (cellMinX, cellMaxX) => {
    const colBlocks = blocks.filter(block => block.x <= cellMaxX && block.x >= cellMinX)

    return pairs(mainRows, (rowMin, rowMax) => {
      // check for merged cells
      const linesBetweenColumn = rows
        .filter(line => (line.x - lh) <= cellMinX && (line.x + line.w) >= cellMaxX)

      const rowMinY = linesBetweenColumn.filter(line => line.y <= rowMin.y).reverse()[0] || rowMin
      const rowMaxY = linesBetweenColumn.filter(line => line.y >= rowMax.y)[0] || rowMax

      return colBlocks
        .filter(block => block.y > (rowMinY.y - lh) && block.y <= (rowMaxY.y - lh))
        .map(block => decode(block.R[0].T))
    })
  }))
}

const table = (data, title, skipHeaders = 0) =>
  flatten(data.Pages.reduce((result, page, index) => {
    if (result.length === 0) {
      const start = page.Texts.find(block => decode(block.R[0].T).startsWith(title))
      if (start) {
        // start new table
        const rows = parseTable(page, start.y)
        const header = rows.slice(0, skipHeaders)
        result.push({ index, rows: rows.slice(skipHeaders), header })
        return result
      }
    } else if (result[result.length - 1].index === index - 1) {
      // continue table from previous page only
      const rows = parseTable(page, 0)
      if (!rows) {
        return result
      }

      const header = rows.slice(0, skipHeaders)
      if (rows && equals(header, result[0].header)) {
        // header matches
        result.push({ index, rows: rows.slice(skipHeaders) })
        return result
      }
    }
    return result
  }, []).map(pages => pages.rows))

const polygonTable = (data, title, rowMapper) => {
  debug(`processing ${title}`)

  const rows = table(data, title, 2)
  const features = rows.map(row => {
    const name = row[0].shift()
    const coords = coordinates(row[0])
    if (coords.length > 1) {
      const poly = turf.polygon([coords], rowMapper(name, row))
      // debug(`mapped ${row}`)
      return poly
    }
    debug(`skipping ${row}`)
    return null
  })
  debug(`processed ${title}`)
  return flatten(features)
}

const pdf = (file) => new Promise((resolve, reject) => {
  const pdfParser = new PDFParser()
  pdfParser.on('pdfParser_dataReady', ({ formImage }) => resolve(formImage))
  pdfParser.on('pdfParser_dataError', ({ parserError }) => reject(parserError))
  pdfParser.loadPDF(file)
})

module.exports = {
  coordinate,
  coordinates,
  table,
  polygonTable,
  pdf,
}
