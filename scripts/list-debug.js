#!/usr/bin/env node
/* eslint import/no-unassigned-import: off */

import 'dotenv/config.js'
import process from 'node:process'

import {listFiles} from '../lib/storage/ftp.js'

const {FTP_HOST, FTP_USER, FTP_PASSWORD, FTP_START_PATH} = process.env

const ftpConfig = {
  host: FTP_HOST,
  user: FTP_USER,
  password: FTP_PASSWORD,
  startPath: FTP_START_PATH,
  verbose: false
}

async function main() {
  try {
    const ftpTree = await listFiles(ftpConfig)
    console.log(ftpTree)
  } catch (error) {
    console.error(error)
  }
}

await main()
