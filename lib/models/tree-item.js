import process from 'node:process'
import mongo from '../util/mongo.js'
import {upsertDataset} from '../models/dataset.js'

const {ROOT_URL} = process.env

export async function saveTreeItems(items, {_storage, _scan}) {
  if (items.length === 0) {
    return []
  }

  const augmentedTreeItems = await Promise.all(items.map(async item => {
    item = {...item, _storage, _scan}

    if (item.dataFormat) {
      const dataset = await upsertDataset(item)

      item._dataset = dataset._id

      if (dataset.computedMetadata) {
        item.computedMetadata = dataset.computedMetadata
      }
    }

    return item
  }))

  await mongo.db.collection('tree_items').insertMany(augmentedTreeItems)
  return augmentedTreeItems
}

export async function dropPreviousTreeItems({_storage, _scan}) {
  await mongo.db.collection('tree_items').deleteMany({_storage, _scan: {$ne: _scan}})
}

export async function updateTreeItemComputedMetadata(itemId, computedMetadata) {
  await mongo.db.collection('tree_items').updateOne(
    {_id: itemId},
    {$set: {computedMetadata}}
  )
}

export async function updateTreeItemAnalyzeError(itemId, analyzeError) {
  await mongo.db.collection('tree_items').updateOne(
    {_id: itemId},
    {$set: {analyzeError}}
  )
}

export async function findDataItemsByScan({_storage, _scan}) {
  const dataItems = await mongo.db.collection('tree_items').find({_storage, _scan, dataFormat: {$ne: null}}).toArray()
  return dataItems.map(item => ({
    ...item,
    downloadUrl: `${ROOT_URL}/storages/${_storage}/files/${item.fullPath}`
  }))
}

export async function itemExists({_storage, fullPath}) {
  const item = await mongo.db.collection('tree_items').findOne({_storage, fullPath})
  return Boolean(item)
}
