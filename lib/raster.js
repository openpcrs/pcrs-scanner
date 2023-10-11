import gdal from 'gdal-async'
import truncate from '@turf/truncate'

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

  const bands = ds.bands.map(({id, colorInterpretation, dataType, blockSize, size}) => ({
    id,
    colorInterpretation,
    dataType,
    blockSize: {height: blockSize.y, width: blockSize.x},
    size: {height: size.y, width: size.x}
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
