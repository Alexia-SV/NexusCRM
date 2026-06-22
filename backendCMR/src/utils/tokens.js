const crypto = require('crypto')
const jwt = require('jsonwebtoken')
const { env } = require('../config/env')
const { durationToMs } = require('./duration')

function signAccessToken(user) {
  return jwt.sign(
    { role: user.role },
    env.jwtAccessSecret,
    { subject: user.id, expiresIn: env.accessTokenExpiresIn },
  )
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.jwtAccessSecret)
}

function createOpaqueToken() {
  return crypto.randomBytes(48).toString('base64url')
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

function refreshTokenExpiry() {
  return new Date(Date.now() + durationToMs(env.refreshTokenExpiresIn))
}

module.exports = {
  signAccessToken,
  verifyAccessToken,
  createOpaqueToken,
  hashToken,
  refreshTokenExpiry,
}
