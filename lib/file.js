import process from 'node:process'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {createWriteStream} from 'node:fs'
import {mkdir, unlink} from 'node:fs/promises'
import {pipeline} from 'node:stream/promises'
import got from 'got'
import {connexion} from './storage/ftp.js'

const TMP_PATH = process.env.TMP_PATH
  ? path.resolve(process.env.TMP_PATH)
  : tmpdir()

async function downloadFileHttp(file) {
  await mkdir(TMP_PATH, {recursive: true})
  const filePath = path.join(TMP_PATH, file.name)

  await pipeline(
    got.stream(file.fullPath),
    createWriteStream(filePath)
  )

  return filePath
}

async function downloadFileFtp(file, options) {
  await mkdir(TMP_PATH, {recursive: true})
  const filePath = path.join(TMP_PATH, file.name)

  const client = await connexion(options)

  try {
    await client.downloadTo(filePath, file.fullPath)

    return filePath
  } finally {
    client.close()
  }
}

export async function downloadFile(file, protocol, options) {
  let filePath

  if (protocol === 'http') {
    filePath = await downloadFileHttp(file)
  } else if (protocol === 'ftp') {
    filePath = await downloadFileFtp(file, options)
  } else {
    throw new Error('Protocole non supporté')
  }

  return filePath
}

export async function deleteFile(filePath) {
  await unlink(filePath)
}
