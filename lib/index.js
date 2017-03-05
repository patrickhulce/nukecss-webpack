const path = require('path')
const _ = require('lodash')
const debug = require('debug')('nukecss-webpack:plugin')

const JsHandler = require('./handlers/js-handler')
const CssHandler = require('./handlers/css-handler')

const MANDATORY_BLACKLIST = ['/css-loader/index.js']

class NukeCssPlugin {
  constructor(options = {}) {
    this._options = Object.assign({
      sourceBlacklist: [/^webpack\/bootstrap/, '/style-loader/addStyles.js'],
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

  static gatherSourceContent(assets, blacklist) {
    return _(assets)
      .filter(item => item.type === 'js' || item.type === 'html')
      .map(({asset, type}) => {
        if (type === 'js') {
          return asset.listMap().children
            .filter(node => {
              const doesNotMatch = pattern => !pattern.test(node.source)
              return node.source && _.every(blacklist, doesNotMatch)
            })
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
  }

  onAdditionalAssets(compilation, done) {
    const assets = _.map(compilation.assets, (asset, name) => {
      const type = path.extname(name).replace(/\./g, '')
      return {asset, name, type}
    })

    const blacklist = NukeCssPlugin.getBlacklist(this._options)
    const sourceContent = NukeCssPlugin.gatherSourceContent(assets, blacklist)
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
