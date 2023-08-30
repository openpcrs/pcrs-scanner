#!/usr/bin/env node
/* eslint import/no-unassigned-import: off */

import 'dotenv/config.js'
import process from 'node:process'

import {getFTPTree} from '../lib/storage/ftp.js'

const {FTP_HOST, FTP_USER, FTP_PASSWORD} = process.env

const ftpConfig = {
  host: FTP_HOST,
  user: FTP_USER,
  password: FTP_PASSWORD,
  verbose: false
}

async function main() {
  try {
    const ftpTree = await getFTPTree(ftpConfig)
    console.log(ftpTree)
  } catch (error) {
    console.error(error)
  }
}

await main()
