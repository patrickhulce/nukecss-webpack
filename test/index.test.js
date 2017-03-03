const fs = require('fs')
const _ = require('lodash')
const webpack = require('webpack')
const SourceMapConsumer = require('source-map').SourceMapConsumer

describe('NukeCssPlugin', function () {
  let fileStats
  const baseConfig = require('./fixtures/webpack.config.js')

  function collectFileStats(stats) {
    return _(stats.compilation.assets)
      .keys()
      .map(filename => {
        const fullPath = `${__dirname}/fixtures/dist/${filename}`
        return {
          filename,
          stats: fs.statSync(fullPath),
          content: /\.(css|js)/.test(filename) && fs.readFileSync(fullPath, 'utf8'),
        }
      })
      .keyBy('filename')
      .value()
  }

  function testWithConfig(config, done) {
    webpack(config, (err, stats) => {
      if (err) {
        done(err)
      } else {
        fileStats = collectFileStats(stats)
        done()
      }
    })
  }

  function findLineAndColumn(css, string) {
    const lines = css.split('\n')
    const line = lines.findIndex(l => l.includes(string)) + 1
    if (line === -1) {
      throw new Error(`could not find string ${string}`)
    }

    const column = lines[line - 1].indexOf(string) + 1
    return {line, column}
  }

  before(function (done) {
    this.timeout(10000)
    testWithConfig(baseConfig, done)
  })

  it.skip('should work with style-loader', function () {
    expect(fileStats['out.js'].content).to.contain('.fa-address-book-o')
    expect(fileStats['out.js'].content).to.not.contain('.my-favorite-class')
  })

  it('should work with ExtractTextPlugin', function () {
    expect(fileStats['out.css'].content).to.contain('.fa-address-book-o')
    expect(fileStats['out.css'].content).to.not.contain('.my-favorite-class')
  })

  it('should generate a source map', function () {
    expect(fileStats).to.have.property('out.css.map')

    const newContent = fileStats['out.css'].content
    const newLocation = findLineAndColumn(newContent, '.fa-table {')
    const consumer = new SourceMapConsumer(fileStats['out.css.map'].content)
    const oldLocation = consumer.originalPositionFor(newLocation)
    expect(oldLocation).to.have.property('source').that.include('entry.extracted.css')
    expect(oldLocation).to.have.property('line', 24)
  })
})
