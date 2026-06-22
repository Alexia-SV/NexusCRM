const { rateLimit } = require('express-rate-limit')

const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    message: 'Too many authentication requests. Try again later.',
    code: 'RATE_LIMITED',
  },
})

const passwordResetRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    message: 'Too many password reset requests. Try again later.',
    code: 'RATE_LIMITED',
  },
})

module.exports = { authRateLimit, passwordResetRateLimit }
