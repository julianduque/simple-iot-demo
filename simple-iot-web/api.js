'use strict'

const debug = require('debug')('iot:web:api')
const express = require('express')
const asyncify = require('express-asyncify')
const dbConnect = require('simple-iot-db')
const api = asyncify(express.Router())
let Agent

api.use('*', async (req, res, next) => {
  if (!Agent) {
    const db = await dbConnect()
    Agent = db.Agent
  }
  next()
})

api.get('/agents', async (req, res) => {
  debug('request to /agents')
  let agents = await Agent.find({ connected: true }, { values: { $slice: -5 } })
  res.send(agents)
})

api.get('/agent/:id', async (req, res, next) => {
  let id = req.params.id
  if (!id) {
    return next(new Error('An agent id must be specified'))
  }

  debug(`request to /agent/${id}`)

  let agent = await Agent.findOne({ uuid: id }, { values: { $slice: -5 } })

  if (!agent) {
    return next(new Error('Agent not found'))
  }

  res.send(agent.toObject())
})

module.exports = api
