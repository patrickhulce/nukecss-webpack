# nukecss-webpack

[![NPM Package](https://badge.fury.io/js/nukecss-webpack.svg)](https://www.npmjs.com/package/nukecss-webpack)
[![Build Status](https://travis-ci.org/patrickhulce/nukecss-webpack.svg?branch=master)](https://travis-ci.org/patrickhulce/nukecss-webpack)
[![Coverage Status](https://coveralls.io/repos/github/patrickhulce/nukecss-webpack/badge.svg?branch=master)](https://coveralls.io/github/patrickhulce/nukecss-webpack?branch=master)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
[![Dependencies](https://david-dm.org/patrickhulce/nukecss-webpack.svg)](https://david-dm.org/patrickhulce/nukecss-webpack)

Uses [nukecss](https://github.com/patrickhulce/nukecss) to eliminate unused css from your webpack bundle. Support for the `extract-text-webpack-plugin` and for `style-loader`.

````bash
# for webpack 4 and mini-css-extract-plugin
npm install --save-dev nukecss-webpack
# for webpack 2/3 and extract-text-webpack-plugin
npm install --save-dev nukecss-webpack@^1.4.0
```


## Usage

#### Install nukecss-webpack
`npm install --save-dev nukecss-webpack`

#### Setup Your Webpack Configuration
```js
const NukeCssPlugin = require('nukecss-webpack')

module.exports = {
  entry: 'my-entry.js',
  output: {
    // ...
  },
  plugins: [
    // ...
    new NukeCssPlugin()
  ],
}
````

#### Save Bytes

**Before**

```
out.css   146 kB       0  [emitted]  main
```

**After**

```
out.css  6.82 kB       0  [emitted]  main
```
