import {omit} from 'lodash-es'
import mongo from '../util/mongo.js'

const rawFiles = []

function filterFiles(tree) {
  for (const file of tree) {
    if (file.isDirectory) {
      filterFiles(file.children)
    } else {
      rawFiles.push(file)
    }
  }

  return rawFiles
}

export async function create(tree) {
  const filteredRawFiles = filterFiles(tree)
  const files = filteredRawFiles.map(file => {
    if (file.modifiedAt) {
      file.modifiedAt = new Date(file.modifiedAt)
    } else if (file.rawModifiedAt) {
      file.rawModifiedAt = new Date(file.rawModifiedAt)
    }

    file.path = file.fullPath.replace(file.name, '')
    file.cacheKey = `${file.fullPath}-${file.size}-${file.modifiedAt?.getTime() || file.rawModifiedAt?.getTime()}`

    mongo.decorateCreation(file)

    return omit(file, 'isDirectory')
  })

  await mongo.db.collection('files').insertMany(files)

  return files
}
