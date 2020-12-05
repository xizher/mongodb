const { MongoClient, ObjectId } = require('mongodb')

class MongodbHelper {

  constructor (config) {
    if (config) {
      this.setConfig(config)
    }
    this._collection = ''
  }

  /**
   * 设置配置项
   * @param {{ host: String, port: Number, user: String, pwd: String, db: String }} config 配置项
   */
  setConfig (config) {
    const { host, port, user, pwd, db } = config
    this._url = `mongodb://${user}:${pwd}@${host}:${port}/${db}`
    this._db = db
  }

  /**
   * 设置操作的集合
   * @param {String} collection 操作的集合
   * @returns {MongodbHelper}
   */
  useCollection (collection) {
    this._collection = collection
    return this
  }

  /**
   * @returns {Promise<MongoClient>}
   */
  _connect () {
    return new Promise((resolve, reject) => {
      MongoClient.connect(this._url, { useUnifiedTopology: true }, (err, client) => {
        if (err) {
          reject(err)
        } else {
          resolve(client)
        }
      })
    })
  }

  // 查
  query (document = {}, { amount = 0, page = 0 } = {}) {
    return new Promise((resolve, reject) => {
      this._connect().then(client => {
        const db = client.db(this._db)
        const cursor = db.collection(this._collection)
          .find(document)
          .limit(amount)
          .skip((page - 1) * amount)
        const resData = []
        cursor.each((err, data) => {
          if (err) {
            client.close()
            reject(err)
          } else {
            if (data !== null) {
              resData.push(data)
            } else {
              client.close()
              resolve(resData)
            }
          }
        })
      })
    })
  }

  // 增
  async insert (documents) {
    const client = await this._connect()
    const db = client.db(this._db)
    let insertResult = Array.isArray(documents)
      ? await db.collection(this._collection).insertMany(documents)
      : await db.collection(this._collection).insertOne(documents)
    client.close()
    return insertResult
  }

  // 删
  async delete (document, isMany) {
    const client = await this._connect()
    const db = client.db(this._db)
    const deleteResult = isMany
      ? await db.collection(this._collection).deleteMany(document)
      : await db.collection(this._collection).deleteOne(document)
    client.close()
    return deleteResult
  }

  // 改
  async update (filter, updater) {
    const client = await this._connect()
    const updarCpy = { $set: updater }
    const db = client.db(this._db)
    const updateResult = await db.collection(this._collection).updateMany(filter, updarCpy, {
      upsert: true
    })
    client.close()
    return updateResult
  }

  // 改：通过ObjecId / _id
  async updateFromOid (id, updater) {
    const client = await this._connect()
    const updarCpy = { $set: updater }
    const db = client.db(this._db)
    const updateResult = await db.collection(this._collection).updateMany({
      _id: ObjectId(id)
    }, updarCpy)
    client.close()
    return updateResult
  }

  async queryFromOid (id) {
    const client = await this._connect()
    const db = client.db(this._db)
    const queryResult = await db.collection(this._collection).findOne({
      _id: ObjectId(id)
    })
    client.close()
    return queryResult
  }

}

module.exports = {
  MongodbHelper,
  mongodbHelper: new MongodbHelper()
}
