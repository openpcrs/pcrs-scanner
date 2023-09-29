#!/usr/bin/env node
/* eslint import/no-unassigned-import: off */
import process from 'node:process'
import minimist from 'minimist'

import {listFiles} from '../lib/storage/ftp.js'

const argv = minimist(process.argv.slice(2))

const ftpOptions = {
  host: argv.host,
  port: argv.port,
  user: argv.user,
  password: argv.password,
  startPath: argv.startPath || '/',
  verbose: false,
  secure: argv.secure
}

const tree = await listFiles(ftpOptions)
console.log(tree)
