/* eslint-disable no-await-in-loop */

import * as ftp from 'basic-ftp'

async function buildTree(path, client) {
  const tree = []
  const files = await client.list(path)

  for (const file of files) {
    const node = {
      name: file.name,
      isDirectory: file.type === 2,
      size: file.size
    }

    if (node.isDirectory) {
      node.children = await buildTree(`${path}/${file.name}`, client)
    }

    tree.push(node)
  }

  return tree
}

class FTPClient {
  constructor(parameters = {}) {
    this.client = new ftp.Client()
    this.client.ftp.verbose = parameters.verbose

    this.host = parameters.host
    this.user = parameters.user
    this.password = parameters.password
  }

  async connect() {
    try {
      await this.client.access({
        host: this.host,
        user: this.user,
        password: this.password
      })
    } catch (error) {
      throw new Error(error)
    }
  }

  async getTree() {
    return buildTree('/', this.client)
  }

  async close() {
    this.client.close()
  }
}

export async function getFTPTree(ftpConfig) {
  const client = new FTPClient(ftpConfig)
  await client.connect()

  try {
    const tree = await client.getTree()
    return tree
  } catch (error) {
    throw new Error(error)
  } finally {
    client.close()
  }
}
