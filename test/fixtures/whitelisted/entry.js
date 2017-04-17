const data = require('./entry.css')
const data2 = require('./entry.extracted.css')
require('./blacklisted')
require('../non-whitelisted')
const myIcons = {
  'fa-address-book-o': true,
  'fa': true,
  'fa-save': true,
  'fa-table': true,
}

console.log(data, data2, myIcons)
