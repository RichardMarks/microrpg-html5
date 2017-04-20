const fs = require('fs')
const path = require('path')
const xml2js = require('xml2js')
const {
  parseNumbers,
  parseBooleans
} = require('xml2js/lib/processors')

const options = {
  normalize: true,
  explicitRoot: false,
  explicitArray: false,
  normalizeTags: true,
  mergeAttrs: true,
  attrValueProcessors: [parseNumbers, parseBooleans],
  valueProcessors: [parseNumbers, parseBooleans]
}

const parser = new xml2js.Parser(options)

const inFile = process.argv[2]
if (inFile) {
  fs.readFile(path.resolve(inFile), (err, xml) => {
    if (err) {
      console.log(err)
      process.exit(1)
      return
    }

    parser.parseString(
      xml,
      (err, result) => {
        if (err) {
          console.log(err)
          process.exit(1)
          return
        }

        console.log(JSON.stringify(result, null, 2))
      }
    )
  })
} else {
  console.log(`Expected Usage: node oel2json.js path/to/oel/file`)
}
