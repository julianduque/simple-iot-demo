#!/usr/bin/env node

'use strict'

/* eslint new-cap: "off" */

const blessed = require('blessed')
const contrib = require('blessed-contrib')
const mqtt = require('mqtt')
const moment = require('moment')
const utils = require('./utils')

const screen = blessed.screen()
const client = mqtt.connect('mqtt://localhost')

const agents = new Map()
const memory = new Map()
let selected

// Create Dashboard
const grid = new contrib.grid({ rows: 2, cols: 4, screen: screen })

// Create Agents Table
const table = grid.set(0, 0, 1, 4, contrib.table, {
  interactive: false,
  fg: 'white',
  label: 'IoT Dashboard',
  columnWidth: [20, 6, 20, 15, 15, 15]
})

const tableHeaders = ['Name', 'PID', 'Hostname', 'Heap Total (Kb)', 'Heap Used (Kb)', 'RSS (Kb)']
table.setData({ headers: tableHeaders, data: [] })

// Create Agents Tree

const tree = grid.set(1, 0, 1, 1, contrib.tree, {
  label: 'Connected Agents'
})

// Memory Graph
const line = grid.set(1, 1, 1, 3, contrib.line, {
  label: 'Memory Information',
  showLegend: true,
  minY: 0,
  maxY: 1e5,
  xPadding: 5
})

// Get Agent Information
client.on('connect', () => {
  client.subscribe('agent/disconnected')
  client.subscribe('agent/message')
})

client.on('message', (topic, payload) => {
  payload = utils.parsePayload(payload)
  switch (topic) {
    case 'agent/disconnected':
      handleAgentDisconnected(payload)
      break
    case 'agent/message':
      handleAgentMessage(payload)
      break
  }
})

function handleAgentDisconnected (payload) {
  agents.delete(payload.agent)
  memory.delete(payload.agent)

  if (selected === payload.agent) {
    selected = null
  }

  renderData()
}

function handleAgentMessage (payload) {
  const data = [
    payload.agent.name,
    payload.agent.pid,
    payload.agent.hostname,
    Math.floor(payload.value.heapTotal / 1024),
    Math.floor(payload.value.heapUsed / 1024),
    Math.floor(payload.value.rss / 1024)
  ]

  agents.set(payload.agent.uuid, data)
  if (!memory.has(payload.agent.uuid)) {
    memory.set(payload.agent.uuid, {
      heapTotal: [],
      heapUsed: [],
      rss: [],
      timestamp: []
    })
  }

  memory.get(payload.agent.uuid)['heapTotal'].push(Math.floor(payload.value.heapTotal / 1024))
  memory.get(payload.agent.uuid)['heapUsed'].push(Math.floor(payload.value.heapUsed / 1024))
  memory.get(payload.agent.uuid)['rss'].push(Math.floor(payload.value.rss / 1024))
  memory.get(payload.agent.uuid)['timestamp'].push(moment(payload.timestamp).format('HH:mm:ss'))

  renderData()
}

function renderData () {
  const tableData = []
  const treeData = {}

  // Table Data
  agents.forEach((v, k) => {
    tableData.push(v)
    let agentName = ` ${v[0]} (${v[1]})`
    treeData[agentName] = {
      uuid: k
    }
  })

  table.setData({ headers: tableHeaders, data: tableData })

  // Tree Data
  tree.setData({
    extended: true,
    children: treeData
  })

  tree.focus()
  renderLine()
  screen.render()
}

tree.on('select', (node) => {
  selected = node.uuid
  renderLine()
})

function renderLine () {
  if (!selected) {
    line.setData([{ x: [], y: [], title: '' }])
    screen.render()
    return
  }

  const memData = memory.get(selected)
  const series = []
  const colors = {
    'heapTotal': 'red',
    'heapUsed': 'green',
    'rss': 'blue'
  }

  Object.keys(memData).forEach(k => {
    if (k === 'timestamp') return
    series.push({
      title: k,
      x: memData.timestamp.slice(-5),
      y: memData[k].slice(-5),
      style: {
        line: colors[k]
      }
    })
  })

  line.setData(series)
  screen.render()
}

// Exit Key
screen.key(['escape', 'q', 'C-c'], (ch, key) => {
  return process.exit(0)
})

// Render Dashboard
screen.render()
