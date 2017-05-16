#!/usr/bin/env node

'use strict';

const path = require('path');
const assert = require('assert');
const utils = require('../utils.js');

assert(!module.parent);
assert(__dirname === process.cwd());

const target = process.argv[2] || 'host';
const input = './test-x-index.js';
const output = './test-output.exe';

let right;

utils.pkg.sync([
  '--target', target,
  '--output', output, input
]);

right = utils.spawn.sync(
  './' + path.basename(output), [],
  { cwd: path.dirname(output),
    stdio: 'pipe', expect: 0 }
);

right = right.stderr.split('\n');
var a = right[0];
var b = right[2].split('(')[1].split(')')[0].split(':')[0];
assert.equal(a, b);
utils.vacuum.sync(output);
