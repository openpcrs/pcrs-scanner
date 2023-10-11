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
const {ROOT_URL} = process.env

const app = express()

app.set('view engine', 'ejs')

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'))
}

app.use(cors({origin: true}))

app.use(express.json())

app.post('/storages', w(async (req, res) => {
  let storage = await createStorage(req.body)
  storage = await askForScan(storage._id)
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

app.post('/storages/:storageId/scan', w(async (req, res) => {
  const storage = await askForScan(req.storage._id)
  res.send(storage)
}))

app.get('/storages/:storageId/data', w(async (req, res) => {
  if (!req.storage.result?.lastSuccessfulScan) {
    throw createError(404, 'No successful scan found')
  }

  const {lastSuccessfulScan} = req.storage.result
  const dataItems = await findDataItemsByScan({_scan: lastSuccessfulScan, _storage: req.storage._id})
  res.send(dataItems)
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

app.get('/storages/:storageId/preview', w(async (req, res) => {
  if (!req.storage.result?.lastSuccessfulScan) {
    throw createError(404, 'No successful scan found')
  }

  const {lastSuccessfulScan} = req.storage.result
  const data = await findDataItemsByScan({_scan: lastSuccessfulScan, _storage: req.storage._id})
  res.render('preview', {data, storageId: req.storage._id})
}))

app.get('/storages/:storageId/preview-map', w(async (req, res) => {
  if (!ROOT_URL) {
    throw createError(500, 'Not configured')
  }

  if (!req.storage.result?.lastSuccessfulScan) {
    throw createError(404, 'No successful scan found')
  }

  const geojsonUrl = `${ROOT_URL}/storages/${req.storage._id}/geojson`
  res.redirect(`https://geojson.io/#data=data:text/x-url,${encodeURIComponent(geojsonUrl)}`)
}))

app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`Start listening on port ${PORT}`)
})
