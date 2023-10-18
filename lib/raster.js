import gdal from 'gdal-async'
import {uniq, sumBy} from 'lodash-es'
import union from '@turf/union'
import hashObject from 'hash-obj'

function getProjectionInfo(ds) {
  const spatialReference = ds.srs

  if (!spatialReference) {
    return null
  }

  const projectionName = spatialReference.getAttrValue('PROJCS')
  const espg = spatialReference.getAuthorityName('PROJCS')
  const epsgCode = spatialReference.getAuthorityCode('PROJCS')

  return {
    name: projectionName,
    code: `${espg}:${epsgCode}`
  }
}

function fixPrecision(float) {
  return Number.parseFloat(float.toFixed(6))
}

function computeEnvelope(ds) {
  const {geoTransform, rasterSize} = ds

  const corners = {
    'Upper Left': {x: 0, y: 0},
    'Upper Right': {x: rasterSize.x, y: 0},
    'Bottom Right': {x: rasterSize.x, y: rasterSize.y},
    'Bottom Left': {x: 0, y: rasterSize.y}
  }

  const wgs84 = gdal.SpatialReference.fromEPSG(4326)
  const coordTransform = new gdal.CoordinateTransformation(ds.srs, wgs84)

  const cornerNames = Object.keys(corners)
  const ring = []

  for (const cornerName of cornerNames) {
    const corner = corners[cornerName]
    const originalPoint = {
      x: geoTransform[0] + (corner.x * geoTransform[1]) + (corner.y * geoTransform[2]),
      y: geoTransform[3] + (corner.x * geoTransform[4]) + (corner.y * geoTransform[5])
    }

    const wgs84Point = coordTransform.transformPoint(originalPoint)
    ring.push([fixPrecision(wgs84Point.y), fixPrecision(wgs84Point.x)])
  }

  ring.push(ring[0])

  return {
    type: 'Polygon',
    coordinates: [ring]
  }
}

export async function computeMetadata(curlPath) {
  const ds = await gdal.openAsync(`/vsicurl/${curlPath}`, 'r')

  if (ds.driver.getMetadata().DCAP_RASTER !== 'YES') {
    throw new Error('Source file is not a raster')
  }

  const compression = ds.getMetadata('IMAGE_STRUCTURE', 'COMPRESSION')

  const bands = ds.bands.map(({id, colorInterpretation, dataType}) => ({
    id,
    colorInterpretation,
    dataType
  }))

  const computedMetadata = {
    fileName: ds.description.split('/').pop(),
    format: ds.driver.getMetadata().DMD_EXTENSION === 'jp2' ? 'JPEG2000' : ds.driver.getMetadata().DMD_LONGNAME,
    extension: ds.driver.getMetadata().DMD_EXTENSION,
    size: {height: ds.rasterSize.y, width: ds.rasterSize.x},
    bands,
    compression: compression?.COMPRESSION_REVERSIBILITY
  }

  if (ds.srs && ds.geoTransform) {
    computedMetadata.envelope = computeEnvelope(ds)
    computedMetadata.projection = getProjectionInfo(ds)

    computedMetadata.pixelSize = {
      width: Math.abs(ds.geoTransform[1]),
      height: Math.abs(ds.geoTransform[5])
    }
  }

  return computedMetadata
}

export function computeRasterResult(dataItems) {
  const rasterFiles = dataItems
    .filter(item => ['jpeg2000', 'geotiff'].includes(item.dataFormat) && item.computedMetadata)

  if (rasterFiles.length === 0) {
    return
  }

  const numRasterFiles = rasterFiles.length

  const dataFormatUniqValues = uniq(rasterFiles.map(item => item.dataFormat))
  const format = dataFormatUniqValues.length === 1 ? dataFormatUniqValues[0] : null

  const sizeRasterFiles = sumBy(rasterFiles, 'size')

  const compressionUniqValues = uniq(rasterFiles
    .filter(item => item.computedMetadata.compression)
    .map(item => item.computedMetadata.compression))
  const compression = compressionUniqValues.length === 1 ? compressionUniqValues[0] : null

  const projectionUniqValues = uniq(rasterFiles
    .filter(item => item.computedMetadata.projection?.name)
    .map(item => item.computedMetadata.projection.name))
  const projection = projectionUniqValues.length === 1 ? projectionUniqValues[0] : null

  // eslint-disable-next-line unicorn/no-array-reduce
  const envelopeFeature = rasterFiles.reduce((acc, item) => {
    if (!item.computedMetadata.envelope) {
      return acc
    }

    const feature = {type: 'Feature', geometry: item.computedMetadata.envelope, properties: {}}
    return acc ? union(acc, feature) : feature
  }, null)

  const envelope = envelopeFeature?.geometry

  const bandsCandidate = rasterFiles
    .find(item => item.computedMetadata.bands)?.computedMetadata.bands
  const bandsHash = hashObject(bandsCandidate)

  const bands = rasterFiles.every(({computedMetadata: {bands}}) => !bands || hashObject(bands) === bandsHash)
    ? bandsCandidate
    : null

  return {
    numRasterFiles,
    sizeRasterFiles,
    format,
    compression,
    projection,
    envelope,
    bands
  }
}
