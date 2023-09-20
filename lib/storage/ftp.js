/* eslint-disable no-await-in-loop */

import * as ftp from 'basic-ftp'

export async function buildTree(path, client) {
  const tree = []
  const files = await client.list(path)

  if (files.length === 0) {
    return []
  }

  for (const file of files) {
    const fullPath = `${path}${path === '/' ? '' : '/'}${file.name}`

    const node = {
      name: file.name,
      isDirectory: file.type === 2,
      size: file.size,
      rawModifiedAt: file.rawModifiedAt,
      fullPath
    }

    if (node.isDirectory) {
      node.children = await buildTree(fullPath, client)
    }

    tree.push(node)
  }

  return tree
}

export async function listFiles(options) {
  const client = new ftp.Client()
  client.ftp.verbose = options.verbose

  const accessOptions = {
    host: options.host,
    user: options.user,
    password: options.password,
    port: options.port || undefined
  }

  if (options.secure === '1') {
    accessOptions.secure = true
    accessOptions.secureOptions = {
      rejectUnauthorized: false
    }
  }

  await client.access(accessOptions)

  try {
    return await buildTree(options.startPath || '/', client)
  } finally {
    client.close()
  }
}
