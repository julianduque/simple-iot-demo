'use strict'

const debug = require('debug')('iot:server')
const mosca = require('mosca')
const redis = require('redis')
const dbConnect = require('simple-iot-db')
const utils = require('./utils')

let backend = {
  type: 'redis',
  redis: redis,
  return_buffers: true
}

let settings = {
  port: 1883,
  backend: backend
}

const server = new mosca.Server(settings)
const clients = new Map()
let Agent

server.on('clientConnected', (client) => {
  debug(`Client Connected: ${client.id}`)
  clients.set(client.id, null)
})

server.on('clientDisconnected', async (client) => {
  debug(`Client Disconnected: ${client.id}`)
  const agent = clients.get(client.id)

  if (agent) {
    // Mark Agent as Disconnected
    agent.connected = false
    await agent.save()
      .catch(handleError)

    // Delete Agent from Clients List
    clients.delete(client.id)

    // Report Changes
    server.publish({ topic: 'agent/disconnected', payload: JSON.stringify({ agent: agent.uuid }) })
    debug(`Client (${client.id}) associated to Agent (${agent.uuid}) marked as disconnected`)
  }
})

server.on('published', async (packet, client) => {
  debug('Received:', packet.topic)

  switch (packet.topic) {
    case 'agent/connected':
    case 'agent/disconnected':
      debug(`Payload: ${packet.payload}`)
      break
    case 'agent/message':
      const payload = utils.parsePayload(packet.payload)

      if (payload) {
        debug(`Payload: ${packet.payload}`)
        // Find or create an Agent
        let agent = await Agent.findOne({ uuid: payload.agent.uuid })
          .catch(handleError)

        if (!agent) {
          agent = new Agent(payload.agent)
        }

        // Add a value to the Agent
        agent.values.push({ memory: payload.value, timestamp: payload.timestamp })

        // Set it as connected
        agent.connected = true

        // Save the Agent
        await agent.save()
          .catch(handleError)

        debug(`Agent (${agent.uuid}) saved`)

        // Notify Agent is Connected
        if (!clients.get(client.id)) {
          clients.set(client.id, agent)
          server.publish({ topic: 'agent/connected', payload: JSON.stringify({ agent: agent.uuid }) })
        }
      }
      break
  }
})

server.on('ready', async () => {
  const db = await dbConnect().catch(handleFatalError)
  Agent = db.Agent
  console.log('Mosca/MQTT server is Running')
})

server.on('error', handleFatalError)

function handleError (err) {
  console.error(`An error ocurred: ${err.message}`)
}

function handleFatalError (err) {
  console.error(`A fatal error ocurred: ${err.message}`)
  process.exit(1)
}
