const NukeCssPlugin = require('../../lib')
const webpack = require('webpack')
const ExtractTextPlugin = require('extract-text-webpack-plugin')

module.exports = {
  devtool: 'source-map',
  entry: `${__dirname}/entry.js`,
  output: {filename: 'out.js', path: `${__dirname}/dist`},
  module: {
    rules: [
      {test: /\.(svg|eot|woff2?|ttf)/, use: 'file-loader'},
      {test: /\.extracted.css$/, use: ExtractTextPlugin.extract({
        use: ['css-loader?sourceMap']
      }), include: __dirname},
      {test: /\.css$/, exclude: /.extracted.css/, use: ['style-loader', 'css-loader'], include: __dirname},
    ],
  },
  plugins: [
    new ExtractTextPlugin('out.css'),
    new NukeCssPlugin({
      sources: [`file://${__dirname}/*.html`],
      sourceMap: true,
      sourceBlacklist: ['blacklisted.js']
    }),
    new webpack.optimize.UglifyJsPlugin({sourceMap: true}),
  ]
}
