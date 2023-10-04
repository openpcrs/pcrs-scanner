#!/usr/bin/env node
import process from 'node:process'
import minimist from 'minimist'

import {computeTree} from '../lib/storage/http.js'

const argv = minimist(process.argv.slice(2))

if (!argv.url) {
  console.log('--url is required')
  process.exit(1)
}

const tree = await computeTree({url: argv.url})
console.log(tree)
