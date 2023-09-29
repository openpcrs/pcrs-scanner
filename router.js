import express from 'express'

import w from './lib/util/w.js'
import errorHandler from './lib/util/error-handler.js'
import {analyzeRaster, gdalAnalyze} from './lib/gdal-analyze.js'

export default function createRouter() {
  const router = new express.Router()

  router.post('/analyze', w(async (req, res) => {
    const {url} = req.query
    const ds = await gdalAnalyze(url)
    const analyze = await analyzeRaster(ds)

    res.send(analyze)
  }))

  router.use(errorHandler)

  return router
}
