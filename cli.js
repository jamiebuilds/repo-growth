#!/usr/bin/env node
// @flow
'use strict';
const meow = require('meow');
const chalk /*: any */ = require('chalk');
const repoGrowth = require('./');

/*::
import type { Opts } from './';
*/

const cli = meow({
  help: `
    $ repo-growth <...flags> [-- <...cloc flags>]

    Flags
      --start, -s <date>      Start Date
      --end, -e <date>        End Date
      --freq, -f <days>       Frequency (in days)
      --json                  Output JSON

    Examples
      $ repo-growth
      $ repo-growth -s 2017-01 -e 2018-01 -f 365

    Dates
      Dates should be formatted YYYY-MM
  `,
  flags: {
    start: {
      type: 'string',
      alias: 's'
    },
    end: {
      type: 'string',
      alias: 'e',
    },
    freq: {
      type: 'number',
      alias: 'f'
    },
    '--': true
  },
});

const VALI_DATE = /^([0-9]{4})-([0-9]{2})$/;

function toDate(dateStr) {
  let match = dateStr.match(VALI_DATE);

  if (!match) {
    console.error(chalk.red(`Invalid date format: "${dateStr}" (must be YYYY-MM)`));
    throw process.exit(1);
  }

  let year = parseInt(match[1], 10);
  let month = parseInt(match[2], 10) - 1;
  let day = 1;

  return new Date(year, month, day);
}

let opts /*: Opts */ = {};
opts.cwd = process.cwd();
if (cli.flags.start) opts.start = toDate(cli.flags.start);
if (cli.flags.end) opts.end = toDate(cli.flags.end);
if (cli.flags.freq) opts.freq = cli.flags.freq;
if (cli.flags['--']) opts.clocArgs = cli.flags['--'];

repoGrowth(opts).then(() => {
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
