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

  const dataset = gdal.openAsync(remoteUrl, 'r')

  return dataset
}
