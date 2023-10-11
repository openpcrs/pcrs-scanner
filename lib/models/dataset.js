import mongo from '../util/mongo.js'

export async function upsertDataset(payload) {
  const {_storage, hash, name, fullPath, size, dataFormat, rawModifiedAt, _scan} = payload

  const fileMetadata = {name, fullPath, size, rawModifiedAt}

  const dataset = await mongo.db.collection('datasets').findOneAndUpdate(
    {_storage, hash},
    {$setOnInsert: {fileMetadata, dataFormat, _firstScan: _scan}},
    {upsert: true, returnDocument: 'after', includeResultMetadata: false}
  )

  return dataset
}

export async function updateComputedMetadata(datasetId, computedMetadata) {
  await mongo.db.collection('datasets').updateOne(
    {_id: datasetId},
    {$set: {computedMetadata}}
  )
}
