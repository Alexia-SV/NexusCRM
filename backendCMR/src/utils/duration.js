const UNITS = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
}

function durationToMs(value) {
  const match = String(value).trim().match(/^(\d+)([smhd])$/)

  if (!match) {
    throw new Error(`Unsupported duration: ${value}`)
  }

  return Number(match[1]) * UNITS[match[2]]
}

module.exports = { durationToMs }
