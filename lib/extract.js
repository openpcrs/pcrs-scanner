const VALID_EXTENSIONS = new Set(['.jp2', '.tiff', '.tif', '.geotiff'])

function isValidFile(fileName) {
  const fileExtension = fileName.split('.').pop().toLowerCase()
  return VALID_EXTENSIONS.has(`.${fileExtension}`)
}

export function extract(tree) {
  const filteredFiles = []

  function recursiveExtract(file) {
    if (file.isDirectory) {
      if (file.children) {
        for (const child of file.children) {
          recursiveExtract(child)
        }
      }
    } else if (isValidFile(file.name)) {
      filteredFiles.push({
        fullPath: file.fullPath,
        size: file.size,
        rawModifiedAt: file.rawModifiedAt
      })
    }
  }

  for (const file of tree) {
    recursiveExtract(file)
  }

  return filteredFiles
}
