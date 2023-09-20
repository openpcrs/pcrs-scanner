#!/usr/bin/env node
/* eslint import/no-unassigned-import: off */

import 'dotenv/config.js'
import process from 'node:process'

import {listFiles as ftpListFiles} from '../lib/storage/ftp.js'
import {listFiles as httpListFiles} from '../lib/storage/http.js'

const {FTP_HOST, FTP_PORT, FTP_USER, FTP_PASSWORD, FTP_START_PATH, FTP_SECURE, HTTP_URL} = process.env

const ftpOptions = {
  host: FTP_HOST,
  port: FTP_PORT,
  user: FTP_USER,
  password: FTP_PASSWORD,
  startPath: FTP_START_PATH,
  verbose: false,
  secure: FTP_SECURE
}

const htmlOptions = {
  url: HTTP_URL
}

const ftpTree = await ftpListFiles(ftpOptions)
const htmlTree = await httpListFiles(htmlOptions)

console.log('ftpTree', ftpTree)
console.log('htmlTree', htmlTree)
