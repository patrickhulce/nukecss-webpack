const path = require('path')

const _ = require('lodash')
const esprima = require('esprima')
const nukecss = require('nukecss')
const ConcatSource = require('webpack-sources').ConcatSource

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

  apply(compiler) {
    compiler.plugin('this-compilation', compilation => {
      compilation.plugin('additional-assets', done => {
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

        const replaceCss = css => nukecss(sources, css)
        assets.forEach(({asset, name, type}) => {
          if (type === 'css') {
            const content = asset.source()
            const nuked = replaceCss(content)
            compilation.assets[name] = new ConcatSource(nuked)
          } else if (type === 'js') {
            asset.listMap().children.forEach(node => {
              if (!NukeCssPlugin.isStyleNode(node)) {
                return
              }

              node.mapGeneratedCode(code => {
                return NukeCssPlugin.replaceCss(code, replaceCss)
              })
            })
          }
        })

        done()
      })
    })
  }
}

module.exports = NukeCssPlugin
