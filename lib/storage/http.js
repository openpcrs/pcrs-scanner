/* eslint-disable no-await-in-loop */

import got from 'got'
import * as cheerio from 'cheerio'

async function extractLinks(url) {
  const response = await got.get(url)
  const $ = cheerio.load(response.body)

  const links = $('a').map((index, element) => $(element).attr('href')).get()

  return links.filter(link => link !== '../')
}

async function getFileMetadata(url) {
  const response = await got.head(url)

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

async function buildTree(url) {
  const tree = []
  const links = await extractLinks(url)

  for (const link of links) {
    const isDirectory = link.endsWith('/')
    const name = isDirectory ? link.slice(0, -1) : link
    const fullPath = `${url}${link}`

    const node = {
      name,
      isDirectory,
      fullPath
    }

    if (isDirectory) {
      node.children = await buildTree(fullPath)
    } else {
      const metadata = await getFileMetadata(fullPath)

      Object.assign(node, {
        isDirectory: false,
        ...metadata
      })
    }

    tree.push(node)
  }

  return tree
}

export async function listFiles(options) {
  const {url} = options

  return buildTree(url)
}
