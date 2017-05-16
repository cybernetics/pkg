'use strict';

var path = require('path');
var callsites = require('callsites');
var fn = callsites()[0].getFileName();
if (path.parse(fn).base === 'callsites.js') {
  console.log('ok');
}
