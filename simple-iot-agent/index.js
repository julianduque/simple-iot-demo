'use strict'

const debug = require('debug')('iot:agent')
const os = require('os')
const mqtt = require('mqtt')
const defaults = require('defaults')
const uuid = require('uuid')
const EventEmitter = require('events')

const options = {
  name: 'untitled',
  interval: 1000,
  mqtt: {
    host: 'mqtt://localhost'
  }
}

class IotAgent extends EventEmitter {
  constructor (opts) {
    super()

    this.options = defaults(opts, options)
    this.started = false
  }

  start () {
    if (!this.started) {
      const opts = this.options
      const client = mqtt.connect(opts.mqtt.host)
      this.started = true

      client.on('connect', () => {
        const agentId = uuid.v4()

        this.emit('connected', agentId)

        setInterval(() => {
          let message = {
            agent: {
              uuid: agentId,
              name: opts.name,
              hostname: os.hostname() || 'localhost',
              pid: process.pid
            },
            value: process.memoryUsage(),
            timestamp: new Date()
          }

          debug('Sending', message)

          client.publish('agent/message', JSON.stringify(message))
          this.emit('message', message)
        }, opts.interval)
      })

      client.on('error', () => {
        this.started = false
      })
    }
  }
}

module.exports = function createAgent (opts) {
  return new IotAgent(opts)
}
