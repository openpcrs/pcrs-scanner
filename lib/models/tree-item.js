import mongo from '../util/mongo.js'
import {upsertDataset} from '../models/dataset.js'

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
  return mongo.db.collection('tree_items').find({_storage, _scan, dataFormat: {$ne: null}}).toArray()
}
