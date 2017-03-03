const path = require('path')

const _ = require('lodash')
// const debug = require('debug')('nukecss-webpack:plugin')
const esprima = require('esprima')
const nukecss = require('nukecss')
const sources = require('webpack-sources')

const RawSource = sources.RawSource
const SourceMapSource = sources.SourceMapSource
const ReplaceSource = sources.ReplaceSource

const CSS_LOADER_PATTERN = /exports\.push\(\[module\./

class NukeCssPlugin {
  constructor(options = {}) {
    this._options = options
  }

  static isStyleNode(node) {
    if (!node.source || !node.source.includes('css-loader')) {
      return false
    }

    return CSS_LOADER_PATTERN.test(node.originalSource)
  }

  static findFirstString(line) {
    const tokens = esprima.tokenize(line)
    const string = _.find(tokens, {type: 'String'}).value
    const start = line.indexOf(string)
    const end = start + string.length
    const parsed = JSON.parse(string.replace(/(^'|'$)/g, '"'))
    return {start, end, string, parsed}
  }

  static replaceCss(code, replace) {
    const relevantIndex = code.search(CSS_LOADER_PATTERN)
    const preamble = code.substr(0, relevantIndex)
    const relevantCode = code.substr(relevantIndex)
    const cssData = NukeCssPlugin.findFirstString(relevantCode)

    return [
      preamble,
      relevantCode.substr(0, cssData.start),
      JSON.stringify(replace(cssData.parsed)),
      relevantCode.substr(cssData.end),
    ].join('')
  }

  onCssAsset(compilation, name, asset, sources) {
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

    const nuked = nukecss(sources, input, nukeCssOpts)
    compilation.assets[name] = this._options.sourceMap && nuked.map ?
      new SourceMapSource(nuked.css, name, nuked.map, input, inputSourceMap) :
      new RawSource(nuked.css || nuked)
  }

  onJsAsset(compilation, name, asset, sources) {
    const allCode = asset.source()
    const replacementAsset = compilation.assets[name] = new ReplaceSource(asset)
    asset.listMap().children.forEach(node => {
      if (!NukeCssPlugin.isStyleNode(node)) {
        return
      }

      const code = node.generatedCode
      const startIndex = allCode.indexOf(code)
      const endIndex = startIndex + code.length
      const replacement = NukeCssPlugin.replaceCss(code, css => nukecss(sources, css))
      replacementAsset.replace(startIndex, endIndex, replacement)
    })
  }

  onAdditionalAssets(compilation, done) {
    const assets = _.map(compilation.assets, (asset, name) => {
      const type = path.extname(name).replace(/\./g, '')
      return {asset, name, type}
    })

    const sources = _(assets)
      .filter(item => item.type === 'js' || item.type === 'html')
      .map(({asset, type}) => {
        if (type === 'js') {
          return asset.listMap().children
            .filter(node => node.source && !node.source.includes('css-loader'))
            .map(node => {
              return {type, content: node.originalSource}
            })
        } else {
          const content = asset.source()
          return {type, content}
        }
      })
      .flatten()
      .value()

    assets.forEach(({asset, name, type}) => {
      if (type === 'css') {
        this.onCssAsset(compilation, name, asset, sources)
      } else if (type === 'js') {
        console.warn('WARNING: style-loader support has been disabled')
        // try {
        //   this.onJsAsset(compilation, name, asset, sources)
        // } catch (err) {
        //   debug(err)
        // }
      }
    })

    done()
  }

  apply(compiler) {
    compiler.plugin('this-compilation', compilation => {
      compilation.plugin('additional-assets', done => {
        this.onAdditionalAssets(compilation, done)
      })
    })
  }
}

module.exports = NukeCssPlugin
