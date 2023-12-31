import createError from 'http-errors'
import {pick} from 'lodash-es'
import hashObject from 'hash-obj'
import mongo from '../util/mongo.js'

function validateTrueHostname(hostname) {
  return /^(([a-zA-Z\d]|[a-zA-Z\d][a-zA-Z\d-]*[a-zA-Z\d])\.)*([A-Za-z\d]|[A-Za-z\d][A-Za-z\d-]*[A-Za-z\d])$/.test(hostname)
}

function validateAddress(address) {
  return /^((\d|[1-9]\d|1\d{2}|2[0-4]\d|25[0-5])\.){3}(\d|[1-9]\d|1\d{2}|2[0-4]\d|25[0-5])$/.test(address)
}

function validateHostname(hostname) {
  return validateTrueHostname(hostname) || validateAddress(hostname)
}

export async function createStorage(payload) {
  if (!['ftp', 'sftp', 'http'].includes(payload.type)) {
    throw createError(400, 'type must be one of ftp, sftp or http')
  }

  const storage = pick(payload, ['type', 'params'])

  if (storage.params?.hostname && !validateHostname(storage.params?.hostname)) {
    throw createError(400, 'hostname is not valid')
  }

  const hash = hashObject(storage).slice(0, 16)

  const existingStorage = await mongo.db.collection('storages').findOne({hash})

  if (existingStorage) {
    return existingStorage
  }

  storage.hash = hash

  storage.scan = {
    status: 'idle',
    step: null,
    processingSince: null,
    queuedAt: null
  }

  mongo.decorateCreation(storage)

  await mongo.db.collection('storages').insertOne(storage)

  return storage
}

export async function getStorage(storageId) {
  return mongo.db.collection('storages').findOne({_id: storageId})
}

export async function deleteStorage(storageId) {
  await mongo.db.collection('storages').deleteOne({_id: storageId})
}

export async function askForScan(storageId) {
  const {value: storage} = await mongo.db.collection('storages').findOneAndUpdate(
    {_id: storageId, 'scan.status': 'idle'},
    {$set: {
      'scan.status': 'pending',
      'scan.queuedAt': new Date()
    }},
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
    {$set: {
      'scan.status': 'processing',
      'scan.step': 'starting',
      'scan.queuedAt': null,
      'scan.processingSince': new Date()
    }},
    {includeResultMetadata: true, returnDocument: 'after', sort: {'scan.queuedAt': 1}}
  )

  return storage
}

export async function progressScan(storageId, step, progress) {
  const {value: storage} = await mongo.db.collection('storages').findOneAndUpdate(
    {_id: storageId, 'scan.status': 'processing'},
    {$set: {
      'scan.step': step,
      'scan.progress': progress,
      'scan.heartbeat': new Date()
    }},
    {includeResultMetadata: true, returnDocument: 'after'}
  )

  if (!storage) {
    throw createError(409, 'Unable to progress scan')
  }

  return storage
}

export async function finishScanWithResult(storageId, result) {
  const {value: storage} = await mongo.db.collection('storages').findOneAndUpdate(
    {_id: storageId, 'scan.status': 'processing'},
    {$set: {
      scan: {
        status: 'idle',
        step: null,
        processingSince: null,
        queuedAt: null
      },
      result
    }},
    {includeResultMetadata: true, returnDocument: 'after'}
  )

  if (!storage) {
    throw createError(409, 'Unable to finish scan')
  }

  return storage
}

export async function finishScanWithError(storageId, error) {
  const {value: storage} = await mongo.db.collection('storages').findOneAndUpdate(
    {_id: storageId, 'scan.status': 'processing'},
    {$set: {
      scan: {
        status: 'idle',
        step: null,
        processingSince: null,
        queuedAt: null,
        lastError: error.message
      }
    }},
    {includeResultMetadata: true, returnDocument: 'after'}
  )

  if (!storage) {
    throw createError(409, 'Unable to finish scan')
  }

  return storage
}
