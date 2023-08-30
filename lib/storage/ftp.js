/* eslint-disable no-await-in-loop */

import * as ftp from 'basic-ftp'

export async function getFTPTree(config) {
  const client = new ftp.Client()
  client.ftp.verbose = config.verbose
  const {startPath} = config

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

  async function buildTree(path) {
    const tree = []
    const files = await client.list(path)

    if (files.length === 0) {
      throw new Error(`Aucune fichier dans le chemin: ${path}`)
    }

    for (const file of files) {
      const fullPath = `${path}${path === '/' ? '' : '/'}${file.name}`
      const node = {
        name: file.name,
        isDirectory: file.type === 2,
        size: file.size,
        modifiedAt: file.modifiedAt,
        fullPath
      }

      if (node.isDirectory) {
        node.children = await buildTree(fullPath)
      }

      tree.push(node)
    }

    return tree
  }

  try {
    await connect()
    const tree = await buildTree(startPath)
    return tree
  } catch (error) {
    console.error(error)
  } finally {
    client.close()
  }
}
