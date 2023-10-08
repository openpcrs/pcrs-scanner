#!/usr/bin/env node
import process from 'node:process'
import minimist from 'minimist'

import {computeTree} from '../lib/tree.js'

const argv = minimist(process.argv.slice(2))

if (!argv.url) {
  console.log('--url is required')
  process.exit(1)
}

const httpParams = {
  url: argv.url
}

const tree = await computeTree('http', httpParams)
console.log(tree)
