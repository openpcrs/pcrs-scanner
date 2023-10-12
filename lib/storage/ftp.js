import * as ftp from 'basic-ftp'
import pLimit from 'p-limit'

async function listItems(path, {client, rateLimit}) {
  const files = await rateLimit(() => client.list(path))

  return Promise.all(files.map(async file => {
    const fullPath = `${path}${path === '/' ? '' : '/'}${file.name}`

    const item = {
      name: file.name,
      type: file.type === 2 ? 'directory' : 'file',
      fullPath: file.type === 2 ? fullPath + '/' : fullPath
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
  const client = new ftp.Client()
  client.ftp.verbose = options.verbose

  const accessOptions = {
    host: options.host,
    user: options.username,
    password: options.password,
    port: options.port || undefined
  }

  if (options.secure === '1') {
    accessOptions.secure = true
    accessOptions.secureOptions = {
      rejectUnauthorized: false
    }
  }

  const rateLimit = pLimit(1)

  const startPath = options.startPath || '/'

  await client.access(accessOptions)

  try {
    const children = await listItems(startPath, {client, rateLimit})
    return {
      type: 'directory',
      fullPath: startPath,
      children
    }
  } finally {
    rateLimit.clearQueue()
    client.close()
  }
}

export function getCurlPath(params) {
  const {host, port, username, password, path} = params

  const origin = port && String(port) !== '21'
    ? `${host}:${port}`
    : host

  const auth = username && password
    ? `${username}:${password}@`
    : ''

  return `ftp://${auth}${origin}${path}`
}
