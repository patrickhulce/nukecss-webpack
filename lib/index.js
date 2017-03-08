const path = require('path')
const _ = require('lodash')
const debug = require('debug')('nukecss-webpack:plugin')

const JsHandler = require('./handlers/js-handler')
const CssHandler = require('./handlers/css-handler')

const MANDATORY_BLACKLIST = [
  /^webpack\/bootstrap/,
  '/css-loader/index.js',
  '/css-loader/lib/css-base.js',
  '/style-loader/addStyles.js',
]

class NukeCssPlugin {
  constructor(options = {}) {
    this._options = Object.assign({
      sources: [],
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

  static gatherSourceContent(options, assets, blacklist) {
    return _(assets)
      .filter(item => item.type === 'js')
      .map(({asset, type}) => {
        return asset.listMap().children
          .filter(node => {
            const doesNotMatch = pattern => !pattern.test(node.source)
            return node.source && _.every(blacklist, doesNotMatch)
          })
          .map(node => {
            return {type, content: node.originalSource}
          })
      })
      .flatten()
      .concat(options.sources)
      .value()
  }

  onAdditionalAssets(compilation, done) {
    const assets = _.map(compilation.assets, (asset, name) => {
      const type = path.extname(name).replace(/\./g, '')
      return {asset, name, type}
    })

    const blacklist = NukeCssPlugin.getBlacklist(this._options)
    const sourceContent = NukeCssPlugin.gatherSourceContent(this._options, assets, blacklist)
    assets.forEach(({asset, name, type}) => {
      try {
        const handler = this._handlers[type]
        const replacementAsset = handler && handler.nukeAsset(name, asset, sourceContent)
        if (replacementAsset) {
          compilation.assets[name] = replacementAsset
        }
      } catch (err) {
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
