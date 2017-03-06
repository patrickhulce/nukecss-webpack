const fs = require('fs')
const _ = require('lodash')
const sinon = require('sinon')
const esprima = require('esprima')

const JsHandler = require('../../lib/handlers/js-handler')

describe('handlers/js-handler.js', () => {
  describe('#collectCssParts', () => {
    function getExpression(code) {
      const ast = esprima.parse(code)
      return ast.body[0].expression
    }

    it('should identify literals', () => {
      const ast = getExpression(`'never' + " say \\"never\\" " + 'y\\'all'`)
      const result = JsHandler.collectCssParts(ast)
      expect(result).to.have.length(3)
      expect(result).to.have.deep.property('0.content', 'never')
      expect(result).to.have.deep.property('1.content', ' say "never" ')
      expect(result).to.have.deep.property('2.content', 'y\'all')
    })

    it('should identify function calls', () => {
      const ast = getExpression(`'url(' + myfunc(1) + ')'`)
      const result = JsHandler.collectCssParts(ast)
      expect(result).to.have.length(3)
      expect(result).to.have.deep.property('0.content', 'url(')
      expect(result).to.have.deep.property('1.content', '___nukecss_replacement_value1___')
      expect(result).to.have.deep.property('1.replacement', 'myfunc(1)')
      expect(result).to.have.deep.property('2.content', ')')
    })

    it('should fail on unexpected input', () => {
      const ast = getExpression(`'foo' + [1,2,3]`)
      expect(() => JsHandler.collectCssParts(ast)).to.throw()
    })
  })

  describe('#collectCss', () => {
    it('should fail when given invalid code', () => {
      expect(() => JsHandler.collectCss('exports.push()')).to.throw()
    })

    context('when CSS is simple', () => {
      const line = 'exports.push([module.i, ".my-class { color: white; }", ""])'
      const cssData = JsHandler.collectCss(line)

      it('should correctly identify start', () => {
        expect(cssData).to.have.property('start', line.indexOf('".my-class'))
      })

      it('should correctly identify end', () => {
        expect(cssData).to.have.property('end', line.indexOf(', ""'))
      })

      it('should correctly extract CSS', () => {
        expect(cssData).to.have.property('css', '.my-class { color: white; }')
      })

      it('should have no replacements', () => {
        expect(cssData).to.have.property('replacements').that.has.length(0)
      })
    })

    context('when CSS is complex', () => {
      const cssA = '.my-class {\\nbackground: url('
      const cssB = '__webpack_require__(0)'
      const cssC = ');\\n}'
      const css = `"${cssA}" + ${cssB} + "${cssC}"`
      const line = `exports.push([module.i, ${css}, ""])`
      const cssData = JsHandler.collectCss(line)

      it('should correctly identify start', () => {
        expect(cssData).to.have.property('start', line.indexOf('".my-class'))
      })

      it('should correctly identify end', () => {
        expect(cssData).to.have.property('end', line.indexOf(', ""'))
      })

      it('should correctly extract CSS', () => {
        const expected = '.my-class {\n' +
          'background: url(___nukecss_replacement_value1___);\n' +
          '}'
        expect(cssData).to.have.property('css', expected)
      })

      it('should have replacements', () => {
        const content = '___nukecss_replacement_value1___'
        const replacement = cssB
        const replacements = cssData.replacements
        expect(replacements).to.have.length(1)
        expect(replacements[0]).to.have.property('content', content)
        expect(replacements[0]).to.have.property('replacement', replacement)
      })
    })
  })

  describe('#computeReplacementJs', () => {
    it('should return basic css', () => {
      const css = '.my-class { color:white; }'
      const result = JsHandler.computeReplacementJs(css, [])
      expect(result).to.eql(`"${css}"`)
    })

    it('should process replacements', () => {
      const css = '.my-class { background: url(__placeholder__); }'
      const replacements = [{content: '__placeholder__', replacement: 'foo(1)'}]
      const result = JsHandler.computeReplacementJs(css, replacements)
      expect(result).to.eql(`".my-class { background: url("+foo(1)+"); }"`)
    })

    it('should process multiple replacements', () => {
      const cssA = '.my-class { background: url(__placeholder__); }\n'
      const cssB = '.my-class2 { background: link(__placeholder2__); }\n'
      const replacements = [
        {content: '__placeholder__', replacement: 'foo(1)'},
        {content: '__placeholder2__', replacement: 'foobar(1)'},
      ]

      const result = JsHandler.computeReplacementJs(cssA + cssB, replacements)
      expect(result).to.contain('url("+foo(1)+");')
      expect(result).to.contain('link("+foobar(1)+");')
    })

    it('should fail with more than one identical placeholder', () => {
      const cssA = '.my-class { background: url(__placeholder__); }\n'
      const cssB = '.my-class2 { background: url(__placeholder__); }\n'
      const replacements = [{content: '__placeholder__', replacement: 'foo(1)'}]
      const func = () => JsHandler.computeReplacementJs(cssA + cssB, replacements)
      expect(func).to.throw()
    })
  })

  describe('#replaceCss', () => {
    const fixturePath = `${__dirname}/fixtures`
    const moduleCode = fs.readFileSync(`${fixturePath}/module.source.js`, 'utf8')
    const expectedTemplate = _.template(fs.readFileSync(`${fixturePath}/module.expected.ejs`, 'utf8'))

    it('should replace only the CSS', () => {
      const replace = sinon.stub().returns('foobar')
      const result = JsHandler.replaceCss(moduleCode, replace)
      const expected = expectedTemplate({css: '"foobar"'})
      expect(result).to.eql(expected)
    })

    it('should use the provided replace function', () => {
      const replace = sinon.stub().returns('foobar')
      JsHandler.replaceCss(moduleCode, replace)
      const originalCss = _.get(replace, 'firstCall.args.0')
      expect(originalCss).to.eql('.fa {\n  background: url(___nukecss_replacement_value1___);\n}\n')
    })

    it('should rehydrate replacements', () => {
      const actual = '__webpack_require__(5)'
      const replacement = '___nukecss_replacement_value1___'

      const replace = sinon.stub().returns(`url(${replacement})`)
      const result = JsHandler.replaceCss(moduleCode, replace)
      const expected = expectedTemplate({css: `"url("+${actual}+")"`})
      expect(result).to.eql(expected)
    })
  })
})
