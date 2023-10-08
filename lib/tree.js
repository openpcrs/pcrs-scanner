import {omit, pick} from 'lodash-es'
import hashObject from 'hash-obj'

import {computeTree as ftpComputeTree} from './storage/ftp.js'
import {computeTree as httpComputeTree} from './storage/http.js'

function flattenTree(node) {
  if (node.type === 'file') {
    const parentDirectory = node.fullPath.slice(0, -node.name.length)
    return [{...node, parentDirectory}]
  }

  if (node.type === 'directory') {
    const items = [omit(node, 'children')]

    for (const child of node.children) {
      items.push(...flattenTree(child))
    }

    return items
  }
}

function computeHash(item) {
  if (item.type === 'directory') {
    return
  }

  return hashObject(pick(item, ['fullPath', 'rawModifiedAt', 'size', 'etag'])).slice(0, 16)
}

function computeDataFormat(item) {
  if (item.type === 'directory') {
    return
  }

  const fileExtension = item.name.toLowerCase().split('.').pop()

  if (fileExtension === 'jp2') {
    return 'jpeg2000'
  }

  if (['tif', 'geotiff', 'geotif', 'tiff'].includes(fileExtension)) {
    return 'geotiff'
  }
}

const computeTreeByStorage = {
  ftp: ftpComputeTree,
  http: httpComputeTree
}

export async function computeTree(type, params) {
  if (!(type in computeTreeByStorage)) {
    throw new Error(`Storage type not supported: ${type}`)
  }

  const rawTree = await computeTreeByStorage[type](params)
  const flattenedTree = flattenTree(rawTree)
  for (const item of flattenedTree) {
    const hash = computeHash(item)

    if (hash) {
      item.hash = hash
    }

    const dataFormat = computeDataFormat(item)

    if (dataFormat) {
      item.dataFormat = dataFormat
    }
  }

  return flattenedTree
}
