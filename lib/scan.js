/* eslint-disable no-await-in-loop */
import {computeTree} from './tree.js'
import {finishScanWithResult, progressScan, finishScanWithError} from './models/storage.js'
import {saveTreeItems, dropPreviousTreeItems, updateTreeItemComputedMetadata, updateTreeItemAnalyzeError} from './models/tree-item.js'
import {updateComputedMetadata} from './models/dataset.js'
import {getCurlPath as ftpGetCurlPath} from './storage/ftp.js'
import {getCurlPath as sftpGetCurlPath} from './storage/sftp.js'
import {getCurlPath as httpGetCurlPath} from './storage/http.js'
import {computeMetadata} from './raster.js'

const getCurlPath = {
  ftp: ftpGetCurlPath,
  sftp: sftpGetCurlPath,
  http: httpGetCurlPath
}

export async function scan(storage) {
  const {_id, type, params, scan: {processingSince}} = storage

  try {
    const progress = {}
    await progressScan(_id, 'listing', progress)

    const rawTreeItems = await computeTree(type, params)
    const treeItems = await saveTreeItems(rawTreeItems, {_storage: _id, _scan: processingSince})

    progress.files = treeItems.filter(item => item.type === 'file').length
    progress.directories = treeItems.filter(item => item.type === 'directory').length

    const dataItems = treeItems.filter(item => item.dataFormat)
    progress.dataFiles = dataItems.length

    const notAnalyzedItems = dataItems.filter(item => !item.computedMetadata)
    progress.notModifiedDataFiles = progress.dataFiles - notAnalyzedItems.length
    progress.analyzedDataFiles = 0
    progress.brokenDataFiles = 0

    await progressScan(_id, 'analyzing', progress)

    for (const dataItem of notAnalyzedItems) {
      const curlPath = getCurlPath[type]({...storage.params, path: dataItem.fullPath})

      try {
        console.log(`Analyzing ${curlPath}`)
        const metadata = await computeMetadata(curlPath)
        await updateComputedMetadata(dataItem._dataset, metadata)
        await updateTreeItemComputedMetadata(dataItem._id, metadata)
        dataItem.computedMetadata = metadata
        progress.analyzedDataFiles++
      } catch (error) {
        console.log(error)
        progress.brokenDataFiles++
        await updateTreeItemAnalyzeError(dataItem._id, error.message)
      } finally {
        await progressScan(_id, 'analyzing', progress)
      }
    }

    const duration = Math.round((Date.now() - processingSince.getTime()) / 1000)
    const result = {lastSuccessfulScan: processingSince, ...progress, duration}

    await finishScanWithResult(_id, result)
    await dropPreviousTreeItems({_storage: _id, _scan: processingSince})
  } catch (error) {
    console.log(error.message)
    await finishScanWithError(_id, error)
  }
}
