// @flow
'use strict';
const spawn = require('spawndamnit');
const chalk /*: any */ = require('chalk');
const path = require('path');
const Table = require('cli-table');
const parseJson = require('parse-json');
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

function formatGitDate(date /*: Date */) {
  let year = String(date.getFullYear());
  let month = String(date.getMonth() + 1).padStart(2, '0');
  let day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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

async function countLinesOfCode(cwd /*: string */, clocArgs /*: Array<string> */, match /*: string */) /*: Object | null */ {
  console.log(chalk.cyan(`Counting lines of code...`));
  console.log();
  let res = await spawn('cloc', clocArgs.concat([
    '--json',
    '--vcs=git',
    match,
  ]), {
    cwd: cwd,
    env: ENV,
  });

  if (res.code === 1) {
    throw new Error(res.stderr.toString());
  }

  let stdout = res.stdout.toString();

  if (stdout === '') {
    return null;
  }

  return parseJson(res.stdout.toString());
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

function formatValue(curr, prev) {
  if (prev) {
    let diff = curr - prev;
    let sign = diff < 0 ? '-' : '+';
    return `${curr} (${sign}${Math.abs(diff)})`;
  } else {
    return `${curr}`;
  }
}

function allPeriodsToTable(allPeriods) {
  let table = new Table({
    head: ['Period', 'Total Files', 'Total LoC'],
  });

  allPeriods.forEach((period, index) => {
    let prevPeriod = allPeriods[index + 1];
    table.push([
      `${chalk.magenta(formatGitDate(period.date))} ${chalk.yellow(period.commit.slice(-8))}`,
      formatValue(period.results.SUM.nFiles, prevPeriod && prevPeriod.results.SUM.nFiles),
      formatValue(period.results.SUM.code, prevPeriod && prevPeriod.results.SUM.code)
    ]);
  });

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
  match?: string,
  start?: Date,
  end?: Date,
  freq?: number,
  clocArgs?: Array<string>,
  branch?: string,
};
*/

async function repoGrowth(opts /*: Opts */ = {}) {
  let cwd = opts.cwd || process.cwd();
  let match = opts.match || '.';
  let start = opts.start || await getFirstCommitDate(cwd);
  let end = opts.end || new Date();
  let freq = opts.freq || 30;
  let clocArgs = opts.clocArgs || [];
  let branch = opts.branch || 'master';

  let current = start;
  let dates = [];

  while (current < end) {
    dates.push(current);
    current = getNextDate(current, freq);
  }

  dates = dates.reverse();

  let periods = [];

  await checkout(cwd, branch);

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
    console.log(`${chalk.magenta(formatGitDate(period.date))} ${chalk.yellow(period.commit)}`)
  }
  console.log();

  let allResults = [];

  for (let period of periods) {
    await checkout(cwd, period.commit);
    console.log();
    let results = await countLinesOfCode(cwd, clocArgs, match);
    if (results === null) continue;
    console.log(periodToTable(results).toString());
    console.log();
    allResults.push({
      date: period.date,
      commit: period.commit,
      results,
    });
  }

  await checkout(cwd, branch);
  console.log();

  console.log(chalk.cyan('Results:'));
  console.log();
  console.log(allPeriodsToTable(allResults).toString());
  console.log();

  return allResults;
}

module.exports = repoGrowth;
