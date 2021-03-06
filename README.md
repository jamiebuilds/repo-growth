# repo-growth

> Measure how fast your repo is growing using cloc

## Install

```sh
npm i -g repo-growth
```

## Usage

**Important** Make sure you've pulled master and your repo is in a clean state.

```sh
repo-growth
```

```
┌─────────────────────┬─────────────┬───────────┐
│ Period              │ Total Files │ Total LoC │
├─────────────────────┼─────────────┼───────────┤
│ 2018-04-13 dcc45d5e │ 4733        │ 367730    │
├─────────────────────┼─────────────┼───────────┤
│ 2018-03-14 ec777af1 │ 4405        │ 341956    │
├─────────────────────┼─────────────┼───────────┤
│ 2018-02-12 f495c9e8 │ 4021        │ 321328    │
├─────────────────────┼─────────────┼───────────┤
│ 2018-01-13 b77fe94c │ 3422        │ 309158    │
├─────────────────────┼─────────────┼───────────┤
│ 2017-12-14 62eb5a8d │ 2259        │ 248322    │
├─────────────────────┼─────────────┼───────────┤
│ 2017-11-14 b5e5dbe6 │ 1315        │ 84613     │
├─────────────────────┼─────────────┼───────────┤
│ 2017-10-15 06a4a3cb │ 185         │ 7658      │
├─────────────────────┼─────────────┼───────────┤
│ 2017-09-15 cbb47a99 │ 142         │ 5777      │
├─────────────────────┼─────────────┼───────────┤
│ 2017-08-16 8e692a43 │ 19          │ 840       │
└─────────────────────┴─────────────┴───────────┘
```

#### `--start`, `-s`

**Default: Date of first commit**

```sh
repo-growth --start 2017-01
```

#### `--end`, `-e`

**Default: Today**

```sh
repo-growth --end 2018-01
```

#### `--freq`, `-f`

**Default: 30**

```sh
repo-growth --freq 7
```

#### `--branch`, `-b`

**Default: "master"**

```sh
repo-growth --branch production
```
