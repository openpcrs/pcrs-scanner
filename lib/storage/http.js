import {Agent as HttpAgent} from 'node:http'
import {Agent as HttpsAgent} from 'node:https'

import got from 'got'
import pLimit from 'p-limit'
import * as cheerio from 'cheerio'

async function isIndexOfPage($) {
  const text = $('title').text().trim()

  const matches = [
    /^Directory of/,
    /^Index of/,
    /^Listing of/
  ]

  return matches.some(match => text.match(match))
}

async function extractList(url, {rateLimit, signal, agent}) {
  const response = await rateLimit(() => got(url, {signal, agent}))
  const $ = cheerio.load(response.body)

  const isIndexOf = await isIndexOfPage($)

  if (!isIndexOf) {
    throw new Error('Unable to list directory items')
  }

  return $('a')
    .map((index, element) => $(element).attr('href'))
    .get()
    .filter(item => !['./', '.', '../', '..'].includes(item) && !item.startsWith('?'))
}

async function computeFileMetadata(url, {rateLimit, signal, agent}) {
  const response = await rateLimit(() => got.head(url, {signal, agent}))

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
    fullPath: url
  }
}

async function computeDirectoryChildren(url, options) {
  const items = await extractList(url, options)
  return Promise.all(items.map(async item => {
    const itemUrl = `${url}${item}`

    if (item.endsWith('/')) {
      const children = await computeDirectoryChildren(itemUrl, options)
      return {
        name: item.slice(0, -1),
        type: 'directory',
        fullPath: itemUrl,
        children
      }
    }

    const fileMetadata = await computeFileMetadata(itemUrl, options)
    return {
      name: item,
      type: 'file',
      fullPath: itemUrl,
      ...fileMetadata
    }
  }))
}

export async function listFiles(options = {}) {
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

  const ac = new AbortController()
  const rateLimit = pLimit(concurrency || 4)

  if (url.endsWith('/')) {
    const children = await computeDirectoryChildren(url, {rateLimit, signal: ac.signal, agent})
    return {
      type: 'directory',
      fullPath: url,
      children
    }
  }

  const fileMetadata = await computeFileMetadata(url, {rateLimit, signal: ac.signal, agent})
  return {
    type: 'file',
    fullPath: url,
    ...fileMetadata
  }
}
