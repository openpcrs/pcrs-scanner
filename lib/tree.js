import {omit, pick} from 'lodash-es'
import hashObject from 'hash-obj'

export function flattenTree(node) {
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

export function signItems(items) {
  return items.map(item => {
    const hash = computeHash(item)
    return hash ? {...item, hash} : item
  })
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

export function addDataFormat(items) {
  return items.map(item => {
    const dataFormat = computeDataFormat(item)
    return dataFormat ? {...item, dataFormat} : item
  })
}
