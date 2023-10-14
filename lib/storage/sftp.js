import Client from 'ssh2-sftp-client'
import pLimit from 'p-limit'

async function connectNewClient(params) {
  const client = new Client()

  const connectOptions = {
    host: params.host,
    username: params.username,
    password: params.password,
    port: params.port || undefined
  }

  await client.connect(connectOptions)
  return client
}

export async function checkParams(params) {
  try {
    const client = await connectNewClient(params)
    client.end()
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
  const client = await connectNewClient(options)

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
    client.end()
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
