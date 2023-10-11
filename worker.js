#!/usr/bin/env node
import 'dotenv/config.js'

import mongo from './lib/util/mongo.js'
import {startNextScan} from './lib/models/storage.js'
import {scan} from './lib/scan.js'

await mongo.connect()

async function scanLoop() {
  const storage = await startNextScan()

  if (storage) {
    await scan(storage)
  }

  setTimeout(scanLoop, 2000)
}

await scanLoop()
