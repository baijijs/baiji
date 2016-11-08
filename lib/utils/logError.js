'use strict';

const chalk = require('chalk');

module.exports = function logError(msg) {
  msg = String(msg || '').valueOf();

  // eslint-disable-next-line no-console
  console.log(chalk.red(`ERROR: ${msg}`));
};
