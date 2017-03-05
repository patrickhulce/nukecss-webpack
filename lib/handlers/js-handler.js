const _ = require('lodash')
const esprima = require('esprima')
const nukecss = require('nukecss')
const ReplaceSource = require('webpack-sources').ReplaceSource

const Handler = require('./handler')

const CSS_LOADER_PATTERN = /exports\.push\(\[module\./

class JsHandler extends Handler {
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
    const cssData = JsHandler.findFirstString(relevantCode)

    return [
      preamble,
      relevantCode.substr(0, cssData.start),
      JSON.stringify(replace(cssData.parsed)),
      relevantCode.substr(cssData.end),
    ].join('')
  }

  nukeAsset(name, asset, sourceContent) {
    const allCode = this._options.sourceMap ?
      asset.node().toStringWithSourceMap().code :
      asset.source()
    const replacementAsset = new ReplaceSource(asset)
    asset.listMap().children.forEach(node => {
      if (!JsHandler.isStyleNode(node)) {
        return
      }

      const code = node.generatedCode
      const startIndex = allCode.indexOf(code)
      const endIndex = startIndex + code.length
      const replacement = JsHandler.replaceCss(code, css => nukecss(sourceContent, css))
      replacementAsset.replace(startIndex, endIndex, replacement)
    })

    return replacementAsset
  }
}

module.exports = JsHandler
