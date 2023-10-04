import createError from 'http-errors'
import {pick} from 'lodash-es'
import mongo from '../util/mongo.js'

export async function createStorage(payload) {
  if (!['ftp', 'http'].includes(payload.type)) {
    throw createError(400, 'type must be one of ftp or http')
  }

  const storage = pick(payload, ['type', 'params'])

  storage.scan = {
    status: 'idle',
    processingSince: null,
    queuedAt: null,
    result: null
  }

  mongo.decorateCreation(storage)

  await mongo.db.collection('storages').insertOne(storage)

  return storage
}

export async function deleteStorage(storageId) {
  await mongo.db.collection('storages').deleteOne({_id: storageId})
}

export async function askForScan(storageId) {
  const {value: storage} = await mongo.db.collection('storages').findOneAndUpdate(
    {_id: storageId, 'scan.status': {$in: ['new', 'idle']}},
    {$set: {'scan.status': 'pending', 'scan.queuedAt': new Date()}},
    {includeResultMetadata: true, returnDocument: 'after'}
  )
  if (!storage) {
    throw createError(409, 'Unable to ask for scan at the moment')
  }

  return storage
}

export async function startNextScan() {
  const {value: storage} = await mongo.db.collection('storages').findOneAndUpdate(
    {'scan.status': 'pending'},
    {$set: {'scan.status': 'processing', 'scan.queuedAt': null, 'scan.processingSince': new Date()}},
    {includeResultMetadata: true, returnDocument: 'after', sort: {'scan.queuedAt': 1}}
  )

  return storage
}

export async function finishScan(storageId, result) {
  const {value: storage} = await mongo.db.collection('storages').findOneAndUpdate(
    {_id: storageId, 'scan.status': 'processing'},
    {$set: {'scan.status': 'idle', 'scan.processingSince': null, 'scan.result': result}},
    {includeResultMetadata: true, returnDocument: 'after'}
  )

  if (!storage) {
    throw createError(409, 'Unable to finish scan')
  }

  return storage
}
