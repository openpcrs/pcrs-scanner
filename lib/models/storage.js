import createError from 'http-errors'
import {pick} from 'lodash-es'
import mongo from '../util/mongo.js'

export async function createStorage(payload) {
  if (!['ftp', 'http'].includes(payload.type)) {
    throw createError(400, 'type must be one of ftp or http')
  }

  const storage = pick(payload, ['type', 'params'])
  storage.status = 'new'
  mongo.decorateCreation(storage)

  await mongo.db.collection('storages').insertOne(storage)

  return storage
}

export async function deleteStorage(storageId) {
  await mongo.db.collections('storages').deleteOne({_id: storageId})
}
