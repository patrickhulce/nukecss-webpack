const nukecss = require('nukecss')

class Handler {
  constructor(options = {}) {
    this._options = options
  }

  nuke(sources, css, options) {
    options = Object.assign({}, this._options.nukecssOptions, options)
    return nukecss(sources, css, options)
  }
}

module.exports = Handler
