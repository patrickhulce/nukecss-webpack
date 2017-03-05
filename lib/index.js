const path = require('path')
const _ = require('lodash')
const debug = require('debug')('nukecss-webpack:plugin')

const JsHandler = require('./handlers/js-handler')
const CssHandler = require('./handlers/css-handler')

class NukeCssPlugin {
  constructor(options = {}) {
    this._options = options

    this._handlers = {
      css: new CssHandler(this._options),
      js: new JsHandler(this._options),
    }
  }

  static gatherSourceContent(assets) {
    return _(assets)
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
  }

  onAdditionalAssets(compilation, done) {
    const assets = _.map(compilation.assets, (asset, name) => {
      const type = path.extname(name).replace(/\./g, '')
      return {asset, name, type}
    })

    const sourceContent = NukeCssPlugin.gatherSourceContent(assets)
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
