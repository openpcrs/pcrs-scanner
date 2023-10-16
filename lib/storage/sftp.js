import {pipeline} from 'node:stream/promises'
import createError from 'http-errors'
import Client from 'ssh2-sftp-client'
import pLimit from 'p-limit'
import hashObject from 'hash-obj'

const clients = new Map()

async function getClient(params) {
  const connectOptions = {
    host: params.host,
    username: params.username,
    password: params.password,
    port: params.port || undefined
  }

  const hash = hashObject(connectOptions).slice(0, 16)

  if (!clients.has(hash)) {
    const cacheEntry = {
      // eslint-disable-next-line no-async-promise-executor
      instancePromise: new Promise(async (resolve, reject) => {
        try {
          const client = new Client()
          await client.connect(connectOptions)

          client.on('close', () => onClose(hash, client))
          client.on('end', () => onClose(hash, client))

          resolve(client)
        } catch (error) {
          reject(error)
        }
      }),
      heartbeat: new Date()
    }

    clients.set(hash, cacheEntry)
  }

  return clients.get(hash).instancePromise
}

function onClose(hash, client) {
  clients.delete(hash)
  client.end()
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
    await getClient(params)
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
  const client = await getClient(options)

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

  const client = await getClient(storage.params)

  try {
    const {size} = await getFileMetadata(client, path)

    if (req.method === 'HEAD') {
      res.set('Content-Length', size)
      return res.status(200).send()
    }

    const ranges = req.range(size)

    if (ranges === -1 || ranges === -2) {
      throw createError(416, 'Ranges header not valid')
    }

    if (ranges && ranges.length > 1) {
      throw createError(416, 'Multi-ranges not supported')
    }

    let readStream

    if (ranges) {
      const [{start, end}] = ranges
      res.set('Content-Length', end - start + 1)
      res.status(206)
      readStream = client.createReadStream(path, {start, end})
    } else {
      res.set('Content-Length', size)
      readStream = client.createReadStream(path)
    }

    await pipeline(readStream, res)
  } catch {
    res.sendStatus(404)
  }
}
