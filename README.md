# Finnish AIP

Library for downloading and parsing [Finnish Aeronautical Information Publication (AIP)](https://ais.fi). Machine readable [AIXM](http://www.aixm.aero) format exists but access is only given to authorized companies in aviation industry. This library parses freely available PDF files into JSON.

AIP is a publication containing information essential to air navigation. The structure and contents of AIPs are standardized by international agreement through ICAO. AIPs normally have three parts – GEN (general), ENR (en route) and AD (aerodromes). Finnish AIP follows [EUROCONTROL electronic AIP](https://www.eurocontrol.int/publications/eaip-specification) specification.

This library can periodically poll for latest AIP images released according to AIRAC (Aeronautical Information Regulation And Control) cycles every 28 or 56 days.

Currently supported data sets include

- Aerodrome ATS airspace (AD 2.17)
- Runway physical characteristics (AD 2.12)
- Prohibited areas (ENR 5.1)
- TMA (ENR 2.1.4)

## Installation

[Node 6.x](https://nodejs.org) is required.

You must have the 7z executable available in your PATH or in the same directory of your package.json file. Check [node-7z](https://www.npmjs.com/package/node-7z) for more detailed instructions.

```
npm install finnish-aip
```

## Usage

```js
const eaip = require('finnish-aip')

// sync now if needed and print results
eaip.init()
    .then(json => console.log(json))
    .catch(err => console.error(err))
```

## API Documentation

#### `init([dir='./data'], [poll=0], [force=false])` => `promise`

Initializes the library and starts a sync if needed. Sync results are cached for later use.

* **dir**: output directory for extracted AIP images
* **poll**: sync every n-days for updates (0 is off)
* **force**: if true starts from scratch

Returns a promise for the results similar to `current()`.

#### `current()` => `promise`

Gets the parsed AIP image in JSON presentation. All geographical features are in [GeoJSON format](http://geojson.org/).

```js
eaip.current()
    .then(data => console.log(JSON.stringify(data, null, 2)))
    .catch(console.error)
```

Example output:
```json
{
  "aerodromes": [
    {
      "identifier": "EFHF",
      "airspaces": [
        {
          "type": "Feature",
          "properties": {
            "designation": "EFHF CTR",
            "upperVerticalLimit": "700 FT MSL",
            "lowerVerticalLimit": "SFC",
            "airspaceClass": "D",
            "callSigns": [ "MALMIN TORNI", "MALMI TOWER" ],
            "languages": [ "FI", "EN" ],
            "hoursOfApplicability": "HO",
            "rmk": [ "RMZ H24", "TMZ H24" ]
          },
          "geometry": { "type": "Polygon", "coordinates": [...] }
        }
      ],
      "runways": [
        {
          "rwy": "09",
          "bearingDegrees": "096.21",
          "dimensionsInMeters": "1024 x 30",
          "surface": [ "18/F/C/X/T", "ASPH" ],
          "threshold": {
            "type": "Feature",
            "properties": {
              "elevation": "47.6",
              "displaced": false
            },
            "geometry": { "type": "Point", "coordinates": [...] }
          },
          "runwayEnd": {
            "type": "Feature",
            "properties": {
              "elevation": "47.6"
            },
            "geometry": { "type": "Point", "coordinates": [...] }
          }
        }
      ]
    }
  ],
  "tma": {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "properties": {
          "designation": "EFHK TMA LOWER",
          "upperVerticalLimit": "2500 FT MSL",
          "lowerVerticalLimit": "1300 FT MSL",
          "airspaceClass": "C",
          "callSigns": [ "HELSINGIN TUTKA", "HELSINKI RADAR" ],
          "languages": [ "EN", "FI" ],
          "frequency": [ "119.100", "129.850" ],
          "hoursOfApplicability": "H24",
          "rmk": [ "TMZ H24" ]
        },
        "geometry": { "type": "Polygon", "coordinates": [...]}
      }
    ]
  },
  "prohibitedAreas": {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "properties": {
          "designation": "EFP20 LOVIISA",
          "upperVerticalLimit": "FL 65",
          "lowerVerticalLimit": "SFC",
          "activityType": "NUCLEAR",
          "hoursOfApplicability": "H24",
          "rmk": []
        },
        "geometry": { "type": "Polygon", "coordinates": [...] }
      }
    ]
  },
  "validFrom": "2016-06-23T00:00:00.000Z",
  "validUntil": "2016-09-15T00:00:00.000Z",
  "cycle": "2016-06-23"
}
```

#### `status()` => `promise`

Gets the status of the current AIP cycle with references to original files for further processing.

```js
eaip.status()
    .then(status => {
        console.log(status)
        return status.files('aero*/*EFH*')
    })
    .then(console.log)
    .catch(console.error)
```

Example output:
```js
{ 
    cycle: '2016-06-23',
    validFrom: '2016-06-23T00:00:00.000Z',
    validUntil: '2016-09-15T00:00:00.000Z',
    files: [Function]
}

[ './data/2016-06-23/aerodromes/EF_AD_2_EFHA_EN.pdf',
  './data/2016-06-23/aerodromes/EF_AD_2_EFHF_EN.pdf',
  './data/2016-06-23/aerodromes/EF_AD_2_EFHK_EN.pdf'
  ...
 ]
```

Files can be parsed using helpers available at `lib/parser.js`.

## Debugging

Run your app with DEBUG=finnish-aip environment variable.