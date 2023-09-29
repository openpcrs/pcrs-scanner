#!/usr/bin/env node
import 'dotenv/config.js'

import process from 'node:process'

import express from 'express'
import cors from 'cors'
import morgan from 'morgan'

import w from './lib/util/w.js'
import errorHandler from './lib/util/error-handler.js'
import {analyzeRaster, gdalAnalyze} from './lib/gdal-analyze.js'

const PORT = process.env.PORT || 5000

const app = express()

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'))
}

app.use(cors({origin: true}))

app.post('/analyze', w(async (req, res) => {
  const {url} = req.query
  const ds = await gdalAnalyze(url)
  const analyze = await analyzeRaster(ds)

  res.send(analyze)
}))

app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`Start listening on port ${PORT}`)
})
