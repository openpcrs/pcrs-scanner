import {Agent as HttpAgent} from 'node:http'
import {Agent as HttpsAgent} from 'node:https'

import got from 'got'
import pLimit from 'p-limit'
import * as cheerio from 'cheerio'

import {sanitizePath} from '../util/path.js'

async function isIndexOfPage($) {
  const text = $('title').text().trim()

  const matches = [
    /^Directory of/,
    /^Index of/,
    /^Listing of/
  ]

  return matches.some(match => text.match(match))
}

async function extractList(directoryPath, {rateLimit, client}) {
  const response = await rateLimit(() => client(directoryPath.slice(1)))
  const $ = cheerio.load(response.body)

  const isIndexOf = await isIndexOfPage($)

  if (!isIndexOf) {
    throw new Error('Unable to list directory items')
  }

  return $('a')
    .map((index, element) => $(element).attr('href'))
    .get()
    .filter(item => !['./', '.', '../', '..'].includes(item) && !item.startsWith('?') && !item.startsWith('/'))
}

async function computeFileMetadata(filePath, {rateLimit, client}) {
  const response = await rateLimit(() => client.head(filePath.slice(1)))

  const contentType = response.headers['content-type']
  const contentLength = response.headers['content-length']

  const size = contentLength && /^\d+$/.test(contentLength)
    ? Number.parseInt(contentLength, 10)
    : null

  const lastModified = response.headers['last-modified']
  const {etag} = response.headers

  return {
    size,
    rawModifiedAt: lastModified,
    contentType,
    etag,
    fullPath: filePath
  }
}

async function computeDirectoryChildren(fullPath, options) {
  const items = await extractList(fullPath, options)
  return Promise.all(items.map(async item => {
    const itemPath = `${fullPath}${item}`

    if (item.endsWith('/')) {
      const children = await computeDirectoryChildren(itemPath, options)
      return {
        name: item.slice(0, -1),
        type: 'directory',
        fullPath: sanitizePath(itemPath),
        children
      }
    }

    const fileMetadata = await computeFileMetadata(itemPath, options)
    return {
      name: item,
      type: 'file',
      fullPath: sanitizePath(itemPath),
      ...fileMetadata
    }
  }))
}

export async function computeTree(options = {}) {
  const {url, concurrency} = options
  let {signal} = options

  if (!url) {
    throw new Error('url is required')
  }

  if (!signal) {
    const ac = new AbortController()
    signal = ac.signal
  }

  const agent = {
    http: new HttpAgent({keepAlive: true, keepAliveMsecs: 1000}),
    https: new HttpsAgent({keepAlive: true, keepAliveMsecs: 1000})
  }

  const parsedUrl = new URL(url)
  const startPath = parsedUrl.pathname

  const client = got.extend({
    prefixUrl: parsedUrl.origin,
    agent,
    signal
  })

  const rateLimit = pLimit(concurrency || 4)

  try {
    if (startPath.endsWith('/')) {
      const children = await computeDirectoryChildren(startPath, {rateLimit, client})
      return {
        type: 'directory',
        fullPath: sanitizePath(startPath),
        children
      }
    }

    const fileMetadata = await computeFileMetadata(startPath, {rateLimit, client})
    return {
      type: 'file',
      fullPath: sanitizePath(startPath),
      ...fileMetadata
    }
  } finally {
    rateLimit.clearQueue()
  }
}

export function getCurlPath({url, path}) {
  return (new URL(path, url)).href
}
