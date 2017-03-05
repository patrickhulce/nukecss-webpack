const OriginalSource = require('webpack-sources').OriginalSource
const SourceMapConsumer = require('source-map').SourceMapConsumer

const CssHandler = require('../../lib/handlers/css-handler')

describe('handlers/css-handler.js', () => {
  const sourceContent = [{content: 'var a = "my-used-class";', type: 'js'}]
  const asset = new OriginalSource(`
    .my-unused-class { color: white; }
    .my-used-class { color: white; }
  `.trim().replace(/(^|\n)\s+/g, '$1'), 'file.css')

  it('should nukecss', () => {
    const handler = new CssHandler()
    const nuked = handler.nukeAsset('out.css', asset, sourceContent)
    const newSource = nuked.source()
    expect(newSource).to.contain('.my-used-class')
    expect(newSource).to.not.contain('.my-unused-class')
  })

  it('should generate a sourcemap', () => {
    const handler = new CssHandler({sourceMap: true})
    const nuked = handler.nukeAsset('out.css', asset, sourceContent)

    const sourceMap = nuked.map()
    expect(sourceMap).to.be.an('object')

    const consumer = new SourceMapConsumer(sourceMap)
    const oldLocation = consumer.originalPositionFor({line: 1, column: 0})
    expect(oldLocation).to.have.property('source', 'file.css')
    expect(oldLocation).to.have.property('line', 2)
    expect(oldLocation).to.have.property('column', 0)
  })
})
