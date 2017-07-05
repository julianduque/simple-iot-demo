'use strict'

const mongoose = require('mongoose')
const agentSchema = require('./agent')

// Use custom Promises
mongoose.Promise = require('bluebird')

// After a successful connection return all the available Models
module.exports = async function connect (dbUrl = 'mongodb://localhost:27017/iot') {
  let conn = await mongoose.createConnection(dbUrl, { useMongoClient: true })
  return {
    Agent: conn.model('Agent', agentSchema)
  }
}
