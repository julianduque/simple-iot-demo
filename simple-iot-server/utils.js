'use strict'

function parsePayload (str) {
  let payload

  try {
    payload = JSON.parse(str)
  } catch (e) {}

  return payload
}

module.exports = {
  parsePayload
}
