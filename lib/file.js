import {downloadFile as ftpDownloadFile} from './storage/ftp.js'
import {downloadFile as sftpDownloadFile} from './storage/sftp.js'

const downloadFileByStorage = {
  ftp: ftpDownloadFile,
  sftp: sftpDownloadFile
}

export async function downloadFile(storage, fullPath, req, res) {
  if (!(storage.type in downloadFileByStorage)) {
    throw new Error(`Storage type not supported: ${storage.type}`)
  }

  return downloadFileByStorage[storage.type](storage, fullPath, req, res)
}
