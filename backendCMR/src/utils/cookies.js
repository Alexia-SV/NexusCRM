const { env } = require('../config/env')
const { durationToMs } = require('./duration')

const REFRESH_COOKIE_NAME = 'nexus_refresh_token'

function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: env.cookieSecure ? 'none' : 'lax',
    maxAge: durationToMs(env.refreshTokenExpiresIn),
    path: '/api/auth',
  }
}

function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: env.cookieSecure ? 'none' : 'lax',
    path: '/api/auth',
  })
}

module.exports = { REFRESH_COOKIE_NAME, refreshCookieOptions, clearRefreshCookie }
