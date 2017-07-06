'use strict'

function parsePayload (data) {
  if (data instanceof Buffer) {
    data = data.toString('utf8')
  }

  try {
    data = JSON.parse(data)
  } catch (e) {
    data = {}
  }

  return data
}

module.exports = {
  parsePayload
}
