import gdal from 'gdal-async'

export async function gdalAnalyze(file, method, options = {}) {
  const {fullPath} = file
  const {host, port, user, password} = options
  let remoteUrl

  if (method === 'http') {
    remoteUrl = `/vsicurl/${fullPath}`
  } else if (method === 'ftp') {
    remoteUrl = port ? `/vsicurl/ftp://${user}:${password}@${host}:${port}${fullPath}` : `/vsicurl/ftp://${user}:${password}@${host}${fullPath}`
  }

  return gdal.openAsync(remoteUrl, 'r')
}

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

function transformToWGS84(ds) {
  const geotransform = ds.geoTransform
  const size = ds.rasterSize
  const coordinates = []

  const corners = {
    'Upper Left': {x: 0, y: 0},
    'Upper Right': {x: size.x, y: 0},
    'Bottom Right': {x: size.x, y: size.y},
    'Bottom Left': {x: 0, y: size.y}
  }

  const wgs84 = gdal.SpatialReference.fromEPSG(4326)
  const coordTransform = new gdal.CoordinateTransformation(ds.srs, wgs84)

  const cornerNames = Object.keys(corners)
  for (const cornerName of cornerNames) {
    const corner = corners[cornerName]
    const originalPoint = {
      x: geotransform[0] + (corner.x * geotransform[1]) + (corner.y * geotransform[2]),
      y: geotransform[3] + (corner.x * geotransform[4]) + (corner.y * geotransform[5])
    }

    const wgs84Point = coordTransform.transformPoint(originalPoint)
    coordinates.push([wgs84Point.y, wgs84Point.x])
  }

  coordinates.push(coordinates[0])

  return coordinates
}

async function formatDs(ds) {
  const compression = ds.getMetadata('IMAGE_STRUCTURE', 'COMPRESSION')
  const projection = getProjectionInfo(ds)
  const coordinates = transformToWGS84(ds)

  const pixelSize = {
    x: Math.abs(ds.geoTransform[1]),
    y: Math.abs(ds.geoTransform[5])
  }

  const feature = {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates
    }
  }

  const bands = ds.bands.map(({id, colorInterpretation, dataType, blockSize, size}) => ({
    id,
    colorInterpretation,
    dataType,
    blockSize: `${blockSize.x}x${blockSize.y}`,
    size: `${size.x}x${size.y}`
  }))

  return {
    fileName: ds.description.split('/').pop(),
    driver: ds.driver.description,
    extension: ds.driver.getMetadata().DMD_EXTENSION,
    size: `${ds.rasterSize.x}x${ds.rasterSize.y}`,
    bands,
    compression: compression?.COMPRESSION_REVERSIBILITY,
    feature,
    projection,
    pixelSize: `${pixelSize.x}x${pixelSize.y}`
  }
}

export async function analyzeRaster(ds) {
  const {driver} = ds
  const metadata = driver.getMetadata()
  if (metadata.DCAP_RASTER !== 'YES') {
    throw new Error('Source file is not a raster')
  }

  return formatDs(ds)
}
