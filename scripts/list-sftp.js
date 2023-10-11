#!/usr/bin/env node
/* eslint import/no-unassigned-import: off */
import process from 'node:process'
import minimist from 'minimist'

import {computeTree} from '../lib/tree.js'

const argv = minimist(process.argv.slice(2))

if (!argv.host) {
  console.log('--host is required')
  process.exit(1)
}

if (!argv.user) {
  console.log('--user is required')
  process.exit(1)
}

if (!argv.password) {
  console.log('--password is required')
  process.exit(1)
}

const sftpParams = {
  host: argv.host,
  port: argv.port,
  user: argv.user,
  password: argv.password,
  startPath: argv.startPath || '/'
}

const tree = await computeTree('sftp', sftpParams)
console.log(tree)
