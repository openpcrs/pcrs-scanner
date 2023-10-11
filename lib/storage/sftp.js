import Client from 'ssh2-sftp-client'
import pLimit from 'p-limit'

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
  const client = new Client()

  const connectOptions = {
    host: options.host,
    username: options.user,
    password: options.password,
    port: options.port || undefined
  }

  const rateLimit = pLimit(options.concurrency || 4)

  const startPath = options.startPath || '/'

  await client.connect(connectOptions)

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
  const {host, port, user, password, path} = params

  const origin = port && String(port) !== '22'
    ? `${host}:${port}`
    : host

  const auth = user && password
    ? `${user}:${password}@`
    : ''

  return `sftp://${auth}${origin}${path}`
}