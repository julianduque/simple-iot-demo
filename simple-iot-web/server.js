'use strict'

const debug = require('debug')('iot:web')
const http = require('http')
const path = require('path')
const EventEmitter = require('events')
const express = require('express')
const sio = require('socket.io')
const mqtt = require('mqtt')
const asyncify = require('express-asyncify')
const createAgent = require('simple-iot-agent')

const pkg = require('./package')
const api = require('./api')

const port = process.env.PORT || 3000
const events = new EventEmitter()
const app = asyncify(express())
const server = http.createServer(app)
const io = sio(server)

app.use(express.static(path.join(__dirname, 'public')))
app.use('/api', api)

// Express Error Handler
app.use((err, req, res, next) => {
  debug(`Error: ${err.message}`)

  if (err.message.match(/not found/)) {
    return res.status(404).send({ error: err.message })
  }

  res.status(500).send({ error: err.message })
})

io.on('connection', (socket) => {
  debug(`WS Connected ${socket.id}`)
})

server.listen(port, () => {
  console.log(`Web server listening on port ${port}`)

  const agent = createAgent({ name: pkg.name })

  agent.start()
  agent.on('connected', (id) => console.log(`Connected ${id}`))
})
