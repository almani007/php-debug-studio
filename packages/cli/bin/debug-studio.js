#!/usr/bin/env node

const { cli } = require('../dist/index');

cli(process.argv.slice(2)).then((exitCode) => {
  process.exit(exitCode);
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
