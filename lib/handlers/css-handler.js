const _ = require('lodash')
const nukecss = require('nukecss')
const RawSource = require('webpack-sources').RawSource
const SourceMapSource = require('webpack-sources').SourceMapSource

const Handler = require('./handler')

class CssHandler extends Handler {
  nukeAsset(name, asset, sourceContent) {
    const nukeCssOpts = {}
    const input = asset.source()

    let inputSourceMap
    if (this._options.sourceMap) {
      inputSourceMap = asset.map()
      nukeCssOpts.sourceMap = {
        from: name,
        to: name,
        inline: _.get(this._options, 'sourceMap.inline', false),
      }
    }

    const nuked = nukecss(sourceContent, input, nukeCssOpts)
    return this._options.sourceMap && nuked.map ?
      new SourceMapSource(nuked.css, name, nuked.map, input, inputSourceMap) :
      new RawSource(nuked.css || nuked)
  }
}

module.exports = CssHandler
