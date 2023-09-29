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

async function extractLinks(url, {rateLimit, signal, agent}) {
  const response = await rateLimit(() => got.get(url, {signal, agent}))
  const $ = cheerio.load(response.body)

  const isIndexOf = await isIndexOfPage($)

  if (!isIndexOf) {
    throw new Error('URL invalide')
  }

  const links = $('a').map((index, element) => $(element).attr('href')).get()

  return links.filter(link => link !== '../')
}

async function getFileMetadata(url, {rateLimit, signal, agent}) {
  const response = await rateLimit(() => got.head(url, {signal, agent}))

  if (!response.headers['content-type']?.startsWith('text/html')) {
    let size
    const fileSize = response.headers['content-length']

    if (fileSize && /^\d+$/.test(fileSize)) {
      size = Number.parseInt(fileSize, 10)
    }

    const fileModifiedAt = response.headers['last-modified']

    return {
      size,
      modifiedAt: fileModifiedAt,
      fullPath: url
    }
  }
}

async function buildTree(url, {rateLimit, signal, agent}) {
  const tree = []
  const links = await extractLinks(url, {rateLimit, signal, agent})

  await Promise.all(links.map(async link => {
    const isDirectory = link.endsWith('/')
    const name = isDirectory ? link.slice(0, -1) : link
    const fullPath = `${url}${link}`

    if (!fullPath.startsWith(url)) {
      return
    }

    const node = {
      name,
      isDirectory,
      fullPath
    }

    if (isDirectory) {
      node.children = await buildTree(fullPath, {rateLimit, signal, agent})
    } else {
      const metadata = await getFileMetadata(fullPath, {rateLimit, signal, agent})

      Object.assign(node, {
        isDirectory: false,
        ...metadata
      })
    }

    tree.push(node)
  }))

  return tree
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

  return buildTree(url, {rateLimit, signal: ac.signal, agent})
}
