/* eslint-disable no-await-in-loop */

import * as ftp from 'basic-ftp'

export async function getFTPTree(config) {
  const client = new ftp.Client()
  client.ftp.verbose = config.verbose

  async function connect() {
    try {
      await client.access({
        host: config.host,
        user: config.user,
        password: config.password
      })
    } catch (error) {
      console.error(error)
    }
  }

  async function buildTree(path = '/') {
    const tree = []
    const files = await client.list(path)

    for (const file of files) {
      const node = {
        name: file.name,
        isDirectory: file.type === 2,
        size: file.size
      }

      if (node.isDirectory) {
        node.children = await buildTree(`${path}/${file.name}`)
      }

      tree.push(node)
    }

    return tree
  }

  try {
    await connect()
    const tree = await buildTree()
    return tree
  } catch (error) {
    console.error(error)
  } finally {
    client.close()
  }
}
