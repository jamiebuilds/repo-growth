// @flow
'use strict';
const spawn = require('spawndamnit');
const chalk /*: any */ = require('chalk');
const path = require('path');
const Table = require('cli-table');
const BIN_DIR = path.join(__dirname, 'node_modules', '.bin');
const ENV_PATH = process.env.PATH || ''

const ENV = Object.assign({}, process.env, {
  PATH: `${BIN_DIR}:${ENV_PATH}`
});

async function getFirstCommitDate(cwd /*: string */) {
  let res = await spawn('git', [
    'log',
    '--max-parents=0',
    'HEAD',
    '--format=%cI',
  ], {
    cwd: cwd
  });

  if (res.code === 1) {
    throw new Error(res.stderr.toString());
  }

  return new Date(res.stdout.toString().trim());
}

function formatGitDate(date /*: Date */, opts /*: { reverseDates?: boolean  } */ = {} ) {
  let year = String(date.getFullYear());
  let month = String(date.getMonth() + 1).padStart(2, '0');
  let day = String(date.getDate()).padStart(2, '0');
  return opts.reverseDates ? `${day}-${month}-${year}`: `${year}-${month}-${day}`;
}


async function getClosestCommitAfterDate(cwd /*: string */, date /*: Date */) /*: Promise<string> */ {
  let res = await spawn('git', [
    'log',
    `--since=${formatGitDate(date)}`,
    '--reverse',
    '--pretty=format:%H',
  ], { cwd });

  if (res.code === 1) {
    throw new Error(res.stderr.toString());
  }

  return res.stdout.toString().split('\n')[0];
}

async function checkout(cwd /*: string */, ref /*: string */) {
  console.log(chalk.cyan(`Checking out ${chalk.yellow(ref)}...`));
  console.log();
  let res = await spawn('git', [
    'checkout',
    ref,
    '--detach',
  ], {
    stdio: 'inherit',
    cwd: cwd
  });

  if (res.code === 1) {
    throw new Error('git errored');
  }
}

async function countLinesOfCode(cwd /*: string */, clocArgs /*: Array<string> */) /*: Object */ {
  console.log(chalk.cyan(`Counting lines of code...`));
  console.log();
  let res = await spawn('cloc', clocArgs.concat([
    '--json',
    '--vcs=git',
    '.',
  ]), {
    cwd: cwd,
    env: ENV,
  });

  if (res.code === 1) {
    throw new Error(res.stderr.toString());
  }

  return JSON.parse(res.stdout.toString());
}

function periodToTable(results) {
  let table = new Table({
    head: ['Language', '# of files', 'Code', 'Comment', 'Blank'],
  });

  function pushRow(name, values) {
    table.push([
      chalk.magenta(String(name)),
      String(values.nFiles),
      String(values.code),
      String(values.comment),
      String(values.blank),
    ]);
  }

  let index = 0;

  Object.keys(results).forEach(name => {
    if (name === 'header') return;
    if (name === 'SUM') return;
    if (index++ < 6) {
      pushRow(name, results[name]);
    }
  });

  pushRow(chalk.bold('Total'), results.SUM);

  return table;
}

function allPeriodsToTable(allPeriods, opts /*: { reverseDates?: boolean  } */ = {}) {
  let table = new Table({
    head: ['Period', 'Total Files', 'Total LoC'],
  });

  for (let period of allPeriods) {
    table.push([
      `${chalk.magenta(formatGitDate(period.date, opts))} ${chalk.yellow(period.commit.slice(-8))}`,
      String(period.results.SUM.nFiles),
      String(period.results.SUM.code)
    ]);
  }

  return table;
}

function getNextDate(date /*: Date */, freq /*: number */) /*: Date */ {
  let nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + freq);
  return nextDate;
}

/*::
export type Opts = {
  cwd?: string,
  start?: Date,
  end?: Date,
  freq?: number,
  reverseDates?: boolean,
  clocArgs?: Array<string>,
};
*/

async function repoGrowth(opts /*: Opts */ = {}) {
  let cwd = opts.cwd || process.cwd();
  let start = opts.start || await getFirstCommitDate(cwd);
  let end = opts.end || new Date();
  let freq = opts.freq || 30;
  let reverseDates = opts.reverseDates || false;
  let clocArgs = opts.clocArgs || [];

  let current = start;
  let dates = [];

  while (current < end) {
    dates.push(current);
    current = getNextDate(current, freq);
  }

  dates = dates.reverse();

  let periods = [];

  await checkout(cwd, 'master');

  let prevCommit;

  for (let date of dates) {
    let commit = await getClosestCommitAfterDate(cwd, date);
    if (commit === prevCommit) continue;
    prevCommit = commit;
    periods.push({ date, commit });
  }

  console.log();
  console.log(chalk.cyan('Matched Commits:'));
  console.log();
  for (let period of periods) {
    console.log(`${chalk.magenta(formatGitDate(period.date, { reverseDates }))} ${chalk.yellow(period.commit)}`)
  }
  console.log();

  let allResults = [];

  for (let period of periods) {
    await checkout(cwd, period.commit);
    console.log();
    let results = await countLinesOfCode(cwd, clocArgs);
    console.log(periodToTable(results).toString());
    console.log();
    allResults.push({ date: period.date, commit: period.commit, results });
  }

  await checkout(cwd, 'master');
  console.log();

  console.log(chalk.cyan('Results:'));
  console.log();
  console.log(allPeriodsToTable(allResults, { reverseDates }).toString());
  console.log();

  return allResults;
}

module.exports = repoGrowth;
