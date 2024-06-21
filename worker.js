#!/usr/bin/env node
/* eslint-disable unicorn/prefer-top-level-await */
import 'dotenv/config.js'

import mongo from './lib/util/mongo.js'
import {startNextScan, listStalledScans, finishScanWithError} from './lib/models/storage.js'
import {scan} from './lib/scan.js'

await mongo.connect()

async function scanLoop() {
  const storage = await startNextScan()

  if (storage) {
    await scan(storage)
  }

  setTimeout(scanLoop, 2000)
}

scanLoop()

async function cleanStalledScansLoop() {
  const stalledScanStorages = await listStalledScans()

  await Promise.all(stalledScanStorages.map(async storage => {
    await finishScanWithError(storage._id, {message: 'Scan stalled'})
  }))

  setTimeout(cleanStalledScansLoop, 60_000)
}

cleanStalledScansLoop()
