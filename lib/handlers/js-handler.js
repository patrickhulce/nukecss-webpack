const assert = require('assert')

const _ = require('lodash')
const esprima = require('esprima')
const nukecss = require('nukecss')
const debug = require('debug')('nukecss-webpack:js-handler')
const ReplaceSource = require('webpack-sources').ReplaceSource

const Handler = require('./handler')

const CSS_SOURCE_PATTERN = /css-loader.*!/
const CSS_LOADER_PATTERN = /exports\.push\(\[module\./

class JsHandler extends Handler {
  static isStyleNode(node) {
    if (!node.source || !CSS_SOURCE_PATTERN.test(node.source)) {
      return false
    }

    return CSS_LOADER_PATTERN.test(node.originalSource)
  }

  static collectCssParts(ast, index = 0) {
    assert.equal(ast.type, 'BinaryExpression')
    assert.equal(ast.operator, '+')

    return _([ast.left, ast.right])
      .map(part => {
        if (part.type === 'Literal') {
          return {content: part.value}
        } else if (part.type === 'CallExpression') {
          const funcName = part.callee.name
          const funcArgs = part.arguments.map(token => token.raw)
          const replacement = `${funcName}(${funcArgs.join(',')})`
          const content = `___nukecss_replacement_value${index}___`
          return {content, replacement}
        } else if (part.type === 'BinaryExpression') {
          return JsHandler.collectCssParts(part, index + 1)
        } else {
          throw new Error(`Unexpected type: ${part.type}`)
        }
      })
      .flatten()
      .value()
  }

  static collectCss(line) {
    const ast = esprima.parse(line, {range: true})
    const callExpression = _.get(ast, 'body.0.expression')
    assert.ok(callExpression, `unable to find CallExpression, ${line}`)
    const cssArgument = _.get(callExpression, 'arguments.0.elements.1')
    assert.ok(cssArgument, `unable to find CSS argument, ${line}`)

    const start = cssArgument.range[0]
    const end = cssArgument.range[1]
    let css = cssArgument.value
    let replacements = []
    if (cssArgument.type !== 'Literal') {
      const cssParts = JsHandler.collectCssParts(cssArgument)
      css = cssParts.map(part => part.content).join('')
      replacements = cssParts.filter(part => part.replacement)
    }

    return {start, end, css, replacements}
  }

  static computeReplacementJs(css, replacements) {
    const parts = replacements.reduce((parts, replacement) => {
      const remaining = parts.pop()

      const splitOnReplacement = remaining.content.split(replacement.content)
      if (splitOnReplacement.length === 2) {
        return parts.concat([
          {type: 'string', content: splitOnReplacement[0]},
          {type: 'js', content: replacement.replacement},
          {type: 'string', content: splitOnReplacement[1]},
        ])
      } else if (splitOnReplacement.length === 1) {
        return parts.concat(remaining)
      } else {
        throw new Error(`Unexpected content: ${remaining.content}`)
      }
    }, [{type: 'string', content: css}])

    return parts
      .map(part => part.type === 'string' ? JSON.stringify(part.content) : part.content)
      .join('+')
  }

  static replaceCss(code, replace) {
    const relevantIndex = code.search(CSS_LOADER_PATTERN)
    const preamble = code.substr(0, relevantIndex)
    const relevantCode = code.substr(relevantIndex)
    const cssData = JsHandler.collectCss(relevantCode)

    const newCss = replace(cssData.css)
    const replacementJs = JsHandler.computeReplacementJs(newCss, cssData.replacements)

    return [
      preamble,
      relevantCode.substr(0, cssData.start),
      replacementJs,
      relevantCode.substr(cssData.end),
    ].join('')
  }

  nukeAsset(name, asset, sourceContent) {
    // TODO: Remove this conditional when webpack-sources#8 is fixed
    const allCode = this._options.sourceMap ?
      asset.node().toStringWithSourceMap().code :
      asset.source()
    const replacementAsset = new ReplaceSource(asset)
    asset.listMap({}).children.forEach(node => {
      if (!JsHandler.isStyleNode(node)) {
        return
      }

      const code = node.generatedCode
      const startIndex = allCode.indexOf(code)
      const endIndex = startIndex + code.length
      try {
        const replacement = JsHandler.replaceCss(code, css => nukecss(sourceContent, css))
        replacementAsset.replace(startIndex, endIndex, replacement)
      } catch (err) {
        console.warn('Unable to replace CSS in module', node.source)
        debug(err)
      }
    })

    return replacementAsset
  }
}

module.exports = JsHandler
