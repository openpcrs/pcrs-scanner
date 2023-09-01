/* eslint-disable no-await-in-loop */

import plunger from 'plunger'

async function analyze(options) {
  const {url} = options

  const files = await plunger.analyzeLocation(url)

  if (files.error) {
    throw new Error(files.error)
  }

  return files.children
}

async function buildTree(files) {
  const tree = []

  for (const file of files) {
    const isDirectory = file.type === 'index-of'

    const node = {
      name: isDirectory ? file.url.split('/').at(-2) : file.fileName,
      isDirectory,
      size: isDirectory ? 0 : file.fileSize,
      rawModifiedAt: file.lastModified,
      fullPath: file.url
    }

    if (file.error) {
      node.error = file.error
    }

    if (isDirectory) {
      const children = await buildTree(file.children)
      node.children = children
    }

    tree.push(node)
  }

  return tree
}

export async function listFiles(options) {
  const files = await analyze(options)
  return buildTree(files)
}
