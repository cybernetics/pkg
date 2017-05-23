/* eslint-disable complexity */

import {
  STORE_CODE, STORE_CONTENT, STORE_LINKS,
  STORE_STAT, isDotJS, isDotJSON
} from '../prelude/common.js';

import assert from 'assert';
import fs from 'fs-extra';
import { log } from './log.js';
import { version } from '../package.json';

const bootstrapText = fs.readFileSync(
  require.resolve('../prelude/bootstrap.js'), 'utf8'
).replace('%VERSION%', version);

const commonText = fs.readFileSync(
  require.resolve('../prelude/common.js'), 'utf8'
);

function itemsToText (items) {
  const len = items.length;
  return len.toString() +
    (len % 10 === 1 ? ' item' : ' items');
}

export default async function ({ records, entrypoint }) {
  const stripe = [];

  for (const file in records) {
    const record = records[file];
    assert(record[STORE_STAT], 'packer: no STORE_STAT');

    if ((record[STORE_CODE] !== undefined) &&
        (record[STORE_CONTENT] !== undefined)) {
      delete record[STORE_CODE];
    }

    for (const store of [ STORE_CODE, STORE_CONTENT, STORE_LINKS, STORE_STAT ]) {
      const value = record[store];
      if (!value) continue;

      if (store === STORE_CODE ||
          store === STORE_CONTENT) {
        assert(record.body);
        if (record.body.directly) {
          stripe.push({ file, store });
        } else
        if (Buffer.isBuffer(record.body)) {
          stripe.push({ file, store, buffer: record.body });
        } else
        if (typeof record.body === 'string') {
          stripe.push({ file, store, buffer: new Buffer(record.body) });
        } else {
          assert(false, 'packer: bad STORE_CODE/STORE_CONTENT');
        }
      } else
      if (store === STORE_LINKS) {
        if (Array.isArray(value)) {
          const buffer = new Buffer(JSON.stringify(value));
          stripe.push({ file, store, buffer });
        } else {
          assert(false, 'packer: bad STORE_LINKS');
        }
      } else
      if (store === STORE_STAT) {
        if (value.directly) {
          const stat = await fs.stat(file);
          assert(typeof stat === 'object', 'packer: bad stat');
          const newStat = Object.assign({}, stat);
          newStat.atime = stat.atime.getTime();
          newStat.mtime = stat.mtime.getTime();
          newStat.ctime = stat.ctime.getTime();
          newStat.birthtime = stat.birthtime.getTime();
          newStat.isFileValue = stat.isFile();
          newStat.isDirectoryValue = stat.isDirectory();

          const buffer = new Buffer(JSON.stringify(newStat));
          stripe.push({ file, store, buffer });
        } else {
          assert(false, 'packer: bad STORE_LINKS');
        }
      } else {
        assert(false, 'packer: unknown store');
      }
    }

    if (record[STORE_CONTENT]) {
      const disclosed = isDotJS(file) || isDotJSON(file);
      log.debug(disclosed ? 'The file was included as DISCLOSED code (with sources)'
                          : 'The file was included as asset content', file);
    } else
    if (record[STORE_CODE]) {
      log.debug('The file was included as compiled code (no sources)', file);
    } else
    if (record[STORE_LINKS]) {
      const value = record[STORE_LINKS];
      log.debug('The directory files list was included (' + itemsToText(value) + ')', file);
    }
  }

  const prelude =
    'return (function (REQUIRE_COMMON, VIRTUAL_FILESYSTEM, DEFAULT_ENTRYPOINT) { ' +
      bootstrapText +
    '\n})(function (exports) {\n' +
      commonText +
    '\n},\n' +
      '%VIRTUAL_FILESYSTEM%' +
    '\n,\n' +
      '%DEFAULT_ENTRYPOINT%' +
    '\n);';

  return { prelude, entrypoint, stripe };
};
