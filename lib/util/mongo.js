import process from 'node:process'
import {MongoClient, ObjectId} from 'mongodb'

const MONGODB_URL = process.env.MONGODB_URL || 'mongodb://localhost'
const MONGODB_DBNAME = process.env.MONGODB_DBNAME || 'pcrs-scanner'

class Mongo {
  async connect(connectionString) {
    if (this.db) {
      throw new Error('mongo.connect() should not be called twice')
    }

    this.client = new MongoClient(connectionString || MONGODB_URL)
    await this.client.connect()
    this.dbName = MONGODB_DBNAME
    this.db = this.client.db(this.dbName)
    await this.createIndexes()
  }

  async createIndexes() {
    this.db.collection('storages').createIndex({hash: 1}, {unique: true})
    this.db.collection('tree_items').createIndex({_storage: 1, _scan: 1})
    this.db.collection('datasets').createIndex({_storage: 1, hash: 1}, {unique: true})
  }

  disconnect(force) {
    const {client} = this
    this.client = undefined
    this.db = undefined

    return client.close(force)
  }

  decorateCreation(obj) {
    const now = new Date()

    obj._created = now
    obj._updated = now
    obj._id = new ObjectId()
  }

  decorateUpdate(obj) {
    obj._updated = new Date()
  }

  asObjectId(string, throwOnFailure = true) {
    try {
      return new ObjectId(string)
    } catch {
      if (throwOnFailure) {
        throw new Error('Unable to parse ObjectId')
      }
    }
  }
}

const mongo = new Mongo()

export default mongo
