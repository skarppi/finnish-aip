const Dms = require('geodesy/dms')
const PDFParser = require('pdf2json/pdfparser')
const turf = require('turf')
const debug = require('debug')('finnish-aip')

const decode = (str) => decodeURIComponent(str).replace(/\s{1,}/g, ' ')

const flatten = (nested) =>
  nested.reduce((prev, next) =>
    (next ? prev.concat(next) : prev), []
  )

const equals = (a, b) => (
  a.length === b.length && a.every((e, i) => {
    if (Array.isArray(e)) {
      return equals(e, b[i])
    }
    return e === b[i]
  })
)

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
  // if (!lat || !lon) {
  //   return null
  // }
  return [lon, lat]
}

const coordinates = cell =>
  cell.join('').replace(/ - /g, '-').split('-')
    .map(row => coordinate(row))
    // .filter(c => c !== null)

const parseTable = (page, offsetY, data) => {
  // debug('YES', offsetY, page.HLines, page.VLines)

  const topCells = page.VLines
    .filter(line => line.y >= offsetY && line.w < 1)
    .sort((a, b) => a.y - b.y)

  const tableMinY = topCells[0].y - topCells[0].w
  const tableMaxY = topCells[0].y + topCells[0].l + topCells[0].w

  const cols = topCells
    .filter(line => line.y < tableMaxY)
    .map(line => line.x - line.w)
    .sort((a, b) => a - b)

  const rows = page.HLines
    .filter(line => line.y > tableMinY && line.y < tableMaxY && line.l > data.Width / 2)
    .map(line => line.y - line.w)
    .sort((a, b) => a - b)

  const blocks = page.Texts.filter(block => block.y > tableMinY && block.y < tableMaxY)

  return Object.keys(rows).map(row => {
    if (row === '0') {
      return null
    }

    const rowMinY = rows[row - 1]
    const rowMaxY = rows[row]
    // debug(row, `row from ${rowMinY} to ${rowMaxY}`)

    const rowBlocks = blocks.filter(block => block.y > rowMinY && block.y <= rowMaxY)

    return Object.keys(cols).map(col => {
      if (col === '0') {
        return null
      }

      const cellMinX = cols[col - 1]
      const cellMaxX = cols[col]
      const cellBlocks = rowBlocks
        .filter(block => block.x <= cellMaxX && block.x >= cellMinX)

      // debug(row, `col from ${cellMinX} to ${cellMaxX}`,
      //   cellBlocks.map(block => decode(block.R[0].T)))

      return cellBlocks.map(block => decode(block.R[0].T))
    }).filter(td => td && td.length > 0)
  }).filter(tr => tr && tr.length > 0)
}

const table = (data, title, skipHeaders = 0) =>
  flatten(data.Pages.reduce((result, page, index) => {
    if (result.length === 0) {
      const start = page.Texts.find(block => decode(block.R[0].T).startsWith(title))
      if (start) {
        // start new table
        const rows = parseTable(page, start.y, data)
        const header = rows.slice(0, skipHeaders)
        result.push({ index, rows: rows.slice(skipHeaders), header })
        return result
      }
    } else if (result[result.length - 1].index === index - 1) {
      // continue table from previous page only
      const rows = parseTable(page, 0, data)
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

const polygonTable = (data, title, props) => {
  debug(`processing ${title}`)

  const rows = table(data, title, 2)
  return flatten(rows.map(row => {
    const name = row[0].shift()
    const coords = coordinates(row[0])
    if (coords.length > 1) {
      const poly = turf.polygon([coords], props(name, row))
      debug(`processed ${title}`)
      return poly
    }
    debug(`skipping ${title}`)
    return null
  }))
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
