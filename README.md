# Finnish AIP

Library for downloading and parsing [Finnish Aeronautical Information Publication (AIP)](https://ais.fi). AIP is a publication containing information essential to air navigation. The structure and contents of AIPs are standardized by international agreement through ICAO. AIPs normally have three parts – GEN (general), ENR (en route) and AD (aerodromes). Finnish AIP follows [EUROCONTROL electronic AIP](https://www.eurocontrol.int/publications/eaip-specification) specification.

This library polls periodically for latest AIP images published according to AIRAC (Aeronautical Information Regulation And Control) cycles every 56 days (double AIRAC cycle) or every 28 days (single AIRAC cycle).

Currently supported data sets include

- Aerodrome ATS airspace (AD 2.17)
- Runway physical charasteristics (AD 2.12)
- Prohibited areas (ENR 5.1)
- TMA (ENR 2.1.4)

All geographical features are in [GeoJSON format](http://geojson.org/).

## Installation

You must have the 7z executable available in your PATH or in the same directory of your package.json file. Check [node-7z](https://www.npmjs.com/package/node-7z) for more detailed instructions.

    npm install --save finnish-aip

## Usage

    const eaip = require('finnish-aip')
    const DATA_DIR = './data'

    // sync now if needed
    eaip.init(DATA_DIR)
        .then(_ => console.log('Sync completed'))
        .catch(err => console.error(err))

    // sync now if needed and every 10 days
    eaip.init(DATA_DIR, 10)

    // reset database now and sync
    eaip.init(DATA_DIR, 0, true)

    // check current status (validFrom, validUntil, files)
    eaip.status()

    // get current results
    eaip.current()

## Debugging
=========

Run your app with DEBUG=finnish-aip environment variable.