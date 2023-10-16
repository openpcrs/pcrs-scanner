import process from 'node:process'
import {compose} from 'node:stream'
import createError from 'http-errors'
import * as ftp from 'basic-ftp'
import pLimit from 'p-limit'
import {createStreamLimiter} from '../util/stream.js'
import {sanitizePath} from '../util/path.js'

const {ROOT_URL} = process.env

async function connectNewClient(params) {
  const client = new ftp.Client()
  client.ftp.verbose = params.verbose

  const accessOptions = {
    host: params.host,
    user: params.username,
    password: params.password,
    port: params.port || undefined
  }

  if (params.secure === '1') {
    accessOptions.secure = true
    accessOptions.secureOptions = {
      rejectUnauthorized: false
    }
  }

  await client.access(accessOptions)
  return client
}

async function getFileMetadata(client, path) {
  const size = await client.size(path)
  let rawModifiedAt

  try {
    rawModifiedAt = await client.lastMod(path)
  } catch {}

  return {rawModifiedAt, size}
}

export async function checkParams(params) {
  try {
    const client = await connectNewClient(params)
    client.close()
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
      type: file.type === 2 ? 'directory' : 'file',
      fullPath: sanitizePath(file.type === 2 ? fullPath + '/' : fullPath)
    }

    if (item.type === 'directory') {
      item.children = await listItems(fullPath, {client, rateLimit})
    }

    if (item.type === 'file') {
      Object.assign(item, {
        size: file.size,
        rawModifiedAt: file.rawModifiedAt
      })
    }

    return item
  }))
}

export async function computeTree(options) {
  const client = await connectNewClient(options)

  const rateLimit = pLimit(1)
  const startPath = options.startPath || '/'

  try {
    const children = await listItems(startPath, {client, rateLimit})
    return {
      type: 'directory',
      fullPath: sanitizePath(startPath),
      children
    }
  } finally {
    rateLimit.clearQueue()
    client.close()
  }
}

export function getCurlPath(params) {
  const {storageId, path} = params

  return `${ROOT_URL}/storages/${storageId}/files${path}`
}

export async function downloadFile(storage, path, req, res) {
  if (storage.type !== 'ftp') {
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
      throw createError(416, 'Ranges header not valid')
    }

    if (ranges && ranges.length > 1) {
      throw createError(416, 'Multi-ranges not supported')
    }

    if (ranges) {
      const [{start, end}] = ranges
      const length = end - start + 1
      res.set('Content-Length', length)
      res.status(206)

      const writeStream = compose(
        createStreamLimiter(length),
        res
      )
      await client.downloadTo(writeStream, path)
    } else {
      res.set('Content-Length', size)
      await client.downloadTo(res, path)
    }
  } catch {
    res.sendStatus(404)
  } finally {
    client.close()
  }
}
