/* eslint-disable no-await-in-loop */

import * as ftp from 'basic-ftp'

export async function listItems(path, client) {
  const tree = []
  const files = await client.list(path)

  if (files.length === 0) {
    return []
  }

  for (const file of files) {
    const fullPath = `${path}${path === '/' ? '' : '/'}${file.name}`

    const node = {
      name: file.name,
      type: file.type === 2 ? 'directory' : 'file',
      fullPath
    }

    if (node.type === 'directory') {
      node.children = await listItems(fullPath, client)
    }

    if (node.type === 'file') {
      Object.assign(node, {
        size: file.size,
        rawModifiedAt: file.rawModifiedAt
      })
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

  const startPath = options.startPath || '/'

  await client.access(accessOptions)

  try {
    const children = await listItems(startPath, client)
    return {
      type: 'directory',
      fullPath: startPath,
      children
    }
  } finally {
    client.close()
  }
}
