# Finnish AIP

Library for downloading and parsing Finnish Aeronautical Information Publication (AIP).

Currently supported features include
- airspaces in GeoJSON format

## Glossary

AIP is a publication containing information essential to air navigation. The structure and contents of AIPs are standardized by international agreement through ICAO. AIPs normally have three parts – GEN (general), ENR (en route) and AD (aerodromes).

AIPs are kept up-to-date by regular revision on a fixed cycle. For operationally significant changes in information, the cycle known as the AIRAC (Aeronautical Information Regulation And Control) cycle is used: revisions are produced every 56 days (double AIRAC cycle) or every 28 days (single AIRAC cycle).

EUROCONTROL has published a specification for an electronic AIP (eAIP). The eAIP Specification aims to harmonise the structure and presentation of AIPs for digital media.

## Installation

You must have the 7z executable available in your PATH or in the same directory of your package.json file. Check [node-7z](https://www.npmjs.com/package/node-7z) for more detailed instructions.

    npm install --save finnish-aip

## Usage

    const eaip = require('finnish-aip')

    // sync now
    eaip.sync()
        .then(_ => console.log('Sync completed'))
        .catch(err => console.error(err))

    // sync now and every 10 days
    eaip.sync(10)

    // check current status (validFrom, validUntil, files)
    eaip.status()

## Debugging
=========

Run your app with DEBUG=finnish-aip environment variable.