#!/usr/bin/env node
/* eslint import/no-unassigned-import: off */
import process from 'node:process'
import minimist from 'minimist'

import {computeTree} from '../lib/storage/ftp.js'
import {flattenTree, signItems, addDataFormat} from '../lib/tree.js'

const argv = minimist(process.argv.slice(2))

if (!argv.host) {
  console.log('--host is required')
  process.exit(1)
}

const ftpOptions = {
  host: argv.host,
  port: argv.port,
  user: argv.user,
  password: argv.password,
  startPath: argv.startPath || '/',
  verbose: argv.verbose,
  secure: argv.secure
}

const tree = await computeTree(ftpOptions)
console.log(addDataFormat(signItems(flattenTree(tree))))
