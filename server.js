#!/usr/bin/env node
import 'dotenv/config.js'

import process from 'node:process'

import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import createError from 'http-errors'

import mongo from './lib/util/mongo.js'
import w from './lib/util/w.js'
import errorHandler from './lib/util/error-handler.js'
import {createStorage, getStorage, askForScan} from './lib/models/storage.js'
import {findDataItemsByScan} from './lib/models/tree-item.js'
import {generateGeoJson} from './lib/geojson.js'

await mongo.connect()

const PORT = process.env.PORT || 5000

const app = express()

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'))
}

app.use(cors({origin: true}))

app.use(express.json())

app.post('/storages', w(async (req, res) => {
  const storage = await createStorage(req.body)
  await askForScan(storage._id)
  res.send(storage)
}))

app.param('storageId', w(async (req, res, next) => {
  let storageId

  try {
    storageId = mongo.asObjectId(req.params.storageId)
  } catch {
    return next(createError(404, 'Invalid storage identifier'))
  }

  req.storage = await getStorage(storageId)

  if (!req.storage) {
    return next(createError(404, 'Storage not found'))
  }

  next()
}))

app.get('/storages/:storageId', w(async (req, res) => {
  res.send(req.storage)
}))

app.get('/storages/:storageId/geojson', w(async (req, res) => {
  if (!req.storage.result?.lastSuccessfulScan) {
    throw createError(404, 'No successful scan found')
  }

  const {lastSuccessfulScan} = req.storage.result
  const dataItems = await findDataItemsByScan({_scan: lastSuccessfulScan, _storage: req.storage._id})
  const fc = generateGeoJson(dataItems)
  res.send(fc)
}))

app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`Start listening on port ${PORT}`)
})
