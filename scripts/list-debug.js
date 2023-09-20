#!/usr/bin/env node
/* eslint import/no-unassigned-import: off */

import 'dotenv/config.js'
import process from 'node:process'

import {listFiles} from '../lib/storage/ftp.js'

const {FTP_HOST, FTP_PORT, FTP_USER, FTP_PASSWORD, FTP_START_PATH, FTP_SECURE} = process.env

const ftpOptions = {
  host: FTP_HOST,
  port: FTP_PORT,
  user: FTP_USER,
  password: FTP_PASSWORD,
  startPath: FTP_START_PATH,
  verbose: true,
  secure: FTP_SECURE
}

const tree = await listFiles(ftpOptions)
console.log(tree)
