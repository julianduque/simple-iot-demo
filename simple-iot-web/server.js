'use strict'

const debug = require('debug')('iot:web')
const http = require('http')
const express = require('express')
const asyncify = require('express-asyncify')
const createAgent = require('simple-iot-agent')

const pkg = require('./package')
const api = require('./api')

const port = process.env.PORT || 3000
const app = asyncify(express())
const server = http.createServer(app)

app.use('/api', api)

// Express Error Handler
app.use((err, req, res, next) => {
  debug(`Error: ${err.message}`)

  if (err.message.match(/not found/)) {
    return res.status(404).send({ error: err.message })
  }

  res.status(500).send({ error: err.message })
})

server.listen(port, () => {
  console.log(`Web server listening on port ${port}`)

  const agent = createAgent({ name: pkg.name })

  agent.start()
  agent.on('connected', (id) => console.log(`Connected ${id}`))
})
