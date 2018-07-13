const NukeCssPlugin = require('../../lib')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')

module.exports = {
  devtool: 'source-map',
  entry: `${__dirname}/whitelisted/entry.js`,
  mode: 'production',
  optimization: {minimize: true},
  output: {filename: 'out.js', path: `${__dirname}/dist`},
  module: {
    rules: [
      {test: /\.(svg|eot|woff2?|ttf)/, use: 'file-loader'},
      {
        test: /\.extracted.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader?sourceMap'],
        include: __dirname,
      },
      {
        test: /\.css$/,
        exclude: /.extracted.css/,
        use: ['style-loader', 'css-loader'],
        include: __dirname,
      },
    ],
  },
  plugins: [
    new MiniCssExtractPlugin({filename: 'out.css'}),
    new NukeCssPlugin({
      sources: [`file://${__dirname}/*.html`],
      sourceMap: true,
      sourceWhitelist: ['/whitelisted/'],
      sourceBlacklist: ['blacklisted.js'],
      nukecssOptions: {
        whitelist: ['unused-but-whitelisted'],
      },
    }),
  ],
}
