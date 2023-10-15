import {pipeline} from 'node:stream/promises'
import createError from 'http-errors'
import Client from 'ssh2-sftp-client'
import pLimit from 'p-limit'

async function connectNewClient(params) {
  const client = new Client()

  const connectOptions = {
    host: params.host,
    username: params.username,
    password: params.password,
    port: params.port || undefined
  }

  await client.connect(connectOptions)
  return client
}

async function getFileMetadata(client, path) {
  const stats = await client.stat(path)

  if (!stats.isFile) {
    throw new Error('Target path is not a file')
  }

  return {rawModifiedAt: String(stats.modifyTime), size: stats.size}
}

export async function checkParams(params) {
  try {
    const client = await connectNewClient(params)
    client.end()
  } catch {
    throw new Error('Unable to connect')
  }
}

async function listItems(path, {client, rateLimit}) {
  const files = await rateLimit(() => client.list(path))

  return Promise.all(files.map(async file => {
    const fullPath = `${path}${path === '/' ? '' : '/'}${file.name}`

    const item = {
      name: file.name,
      type: file.type === 'd' ? 'directory' : 'file',
      fullPath: file.type === 'd' ? fullPath + '/' : fullPath
    }

    if (item.type === 'directory') {
      item.children = await listItems(fullPath, {client, rateLimit})
    }

    if (item.type === 'file') {
      Object.assign(item, {
        size: file.size,
        rawModifiedAt: file.modifyTime.toString()
      })
    }

    return item
  }))
}

export async function computeTree(options) {
  const client = await connectNewClient(options)

  const rateLimit = pLimit(options.concurrency || 4)
  const startPath = options.startPath || '/'

  try {
    const children = await listItems(startPath, {client, rateLimit})
    return {
      type: 'directory',
      fullPath: startPath,
      children
    }
  } finally {
    rateLimit.clearQueue()
    client.end()
  }
}

export function getCurlPath(params) {
  const {host, port, username, password, path} = params

  const origin = port && String(port) !== '22'
    ? `${host}:${port}`
    : host

  const auth = username && password
    ? `${username}:${password}@`
    : ''

  return `sftp://${auth}${origin}${path}`
}

export async function downloadFile(storage, path, req, res) {
  if (storage.type !== 'sftp') {
    throw new Error('Storage type mismatch')
  }

  res.set('Accept-Ranges', 'bytes')

  const client = await connectNewClient(storage.params)

  try {
    const {size} = await getFileMetadata(client, path)

    if (req.method === 'HEAD') {
      res.set('Content-Length', size)
      return res.status(200).send()
    }

    const ranges = req.range(size)

    if (ranges === -1 || ranges === -2) {
      throw createError(400, 'Ranges header not valid')
    }

    if (ranges && ranges.length > 1) {
      throw createError(400, 'Multi-ranges not supported')
    }

    let readStream

    if (ranges) {
      const [{start, end}] = ranges
      res.set('Content-Length', end - start + 1)
      readStream = client.createReadStream(path, {start, end})
    } else {
      res.set('Content-Length', size)
      readStream = client.createReadStream(path)
    }

    await pipeline(readStream, res)
  } catch {
    res.sendStatus(404)
  } finally {
    client.end()
  }
}
