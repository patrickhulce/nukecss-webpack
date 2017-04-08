const path = require('path')
const _ = require('lodash')
const debug = require('debug')('nukecss-webpack:plugin')

const JsHandler = require('./handlers/js-handler')
const CssHandler = require('./handlers/css-handler')

const MANDATORY_BLACKLIST = [
  /^webpack\/bootstrap/,
  '/css-loader/lib/css-base.js',
  '/style-loader/addStyles.js',
]

class NukeCssPlugin {
  constructor(options = {}) {
    this._options = Object.assign({
      sources: [],
      sourceMap: false,
      sourceBlacklist: [],
    }, options)

    this._handlers = {
      css: new CssHandler(this._options),
      js: new JsHandler(this._options),
    }
  }

  static getBlacklist(options) {
    return MANDATORY_BLACKLIST.concat(options.sourceBlacklist)
      .map(item => {
        return typeof item === 'string' ?
          new RegExp(_.escapeRegExp(item)) : item
      })
  }

  static determineJsContent(node) {
    const source = node.source
    const content = node.originalSource

    if (source.includes('/css-loader/index.js') && !content.includes('removed by extract-text')) {
      const indexOfLocals = content.indexOf('exports.locals')
      return indexOfLocals >= 0 ? content.slice(indexOfLocals) : ''
    } else {
      return content
    }
  }

  static gatherJsSourceContent(blacklist, asset) {
    return asset.listMap({}).children
      .map(node => {
        if (!node.source) {
          return false
        } else if (blacklist.find(pattern => pattern.test(node.source))) {
          return false
        }

        return {
          type: 'js',
          content: NukeCssPlugin.determineJsContent(node),
        }
      })
      .filter(item => item && item.content)
  }

  static gatherAllSourceContent(options, assets) {
    const blacklist = NukeCssPlugin.getBlacklist(options)
    return _(assets)
      .filter(item => item.type === 'js')
      .map(item => NukeCssPlugin.gatherJsSourceContent(blacklist, item.asset))
      .flatten()
      .concat(options.sources)
      .value()
  }

  onAdditionalAssets(compilation, done) {
    const assets = _.map(compilation.assets, (asset, name) => {
      const type = path.extname(name).replace(/\./g, '')
      return {asset, name, type}
    })

    const sourceContent = NukeCssPlugin.gatherAllSourceContent(this._options, assets)
    assets.forEach(({asset, name, type}) => {
      try {
        const handler = this._handlers[type]
        const replacementAsset = handler && handler.nukeAsset(name, asset, sourceContent)
        if (replacementAsset) {
          compilation.assets[name] = replacementAsset
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('NukeCssPlugin failed to process', name)
        debug(err)
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
