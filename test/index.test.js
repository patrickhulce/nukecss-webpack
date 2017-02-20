const fs = require('fs')
const _ = require('lodash')
const webpack = require('webpack')

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
          content: fs.readFileSync(fullPath, 'utf8'),
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

  before(function (done) {
    this.timeout(10000)
    testWithConfig(baseConfig, done)
  })

  it('should work with style-loader', function () {
    expect(fileStats['out.js'].content).to.contain('.fa-address-book-o')
    expect(fileStats['out.js'].content).to.not.contain('.my-favorite-class')
  })

  it('should work with ExtractTextPlugin', function () {
    expect(fileStats['out.css'].content).to.contain('.fa-address-book-o')
    expect(fileStats['out.css'].content).to.not.contain('.my-favorite-class')
  })
})
